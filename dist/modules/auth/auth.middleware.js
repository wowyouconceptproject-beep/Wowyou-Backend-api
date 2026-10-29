"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_COOKIE_NAME = void 0;
exports.auth = auth;
exports.hashSessionToken = hashSessionToken;
const node_crypto_1 = require("node:crypto");
const prisma_1 = require("../../lib/prisma");
const jwt_1 = require("./jwt");
const SESSION_COOKIE_NAME = "wowyou_session";
exports.SESSION_COOKIE_NAME = SESSION_COOKIE_NAME;
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";
const sessionCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    ...(isProduction ? { domain: ".wowyouevent.com" } : {}),
};
function readCookie(req, name) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
        return null;
    }
    for (const part of cookieHeader.split(";")) {
        const separator = part.indexOf("=");
        if (separator === -1) {
            continue;
        }
        const key = part.slice(0, separator).trim();
        if (key !== name) {
            continue;
        }
        try {
            return decodeURIComponent(part.slice(separator + 1).trim());
        }
        catch {
            return null;
        }
    }
    return null;
}
function hashSessionToken(token) {
    return (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
}
async function auth(req, res, next) {
    try {
        const sessionToken = readCookie(req, SESSION_COOKIE_NAME);
        /*
         * Browser authentication:
         * Validate the server-side session stored in the database.
         */
        if (sessionToken) {
            const tokenHash = hashSessionToken(sessionToken);
            const session = await prisma_1.prisma.authSession.findUnique({
                where: { tokenHash },
                select: {
                    id: true,
                    userId: true,
                    lastActivityAt: true,
                    expiresAt: true,
                    revokedAt: true,
                },
            });
            const now = new Date();
            const sessionExpired = !session ||
                session.revokedAt !== null ||
                session.expiresAt <= now ||
                now.getTime() - session.lastActivityAt.getTime() >=
                    INACTIVITY_LIMIT_MS;
            if (sessionExpired) {
                if (session && !session.revokedAt) {
                    await prisma_1.prisma.authSession.update({
                        where: { id: session.id },
                        data: { revokedAt: now },
                    });
                }
                res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
                res.status(401).json({
                    success: false,
                    message: "Your session has expired. Please log in again.",
                    code: "SESSION_EXPIRED",
                });
                return;
            }
            /*
             * Refresh the activity timestamp only after the session
             * has passed validation.
             */
            await prisma_1.prisma.authSession.update({
                where: { id: session.id },
                data: { lastActivityAt: now },
            });
            req.user = { userId: session.userId };
            next();
            return;
        }
        /*
         * Mobile authentication:
         * Preserve existing Bearer JWT support for Flutter and
         * other clients that do not use browser session cookies.
         */
        const authorization = req.headers.authorization;
        const bearerToken = authorization?.startsWith("Bearer ")
            ? authorization.slice(7).trim()
            : null;
        if (!bearerToken) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }
        const payload = (0, jwt_1.verifyToken)(bearerToken);
        if (!payload?.userId) {
            res.status(401).json({
                success: false,
                message: "Invalid authentication token.",
            });
            return;
        }
        req.user = { userId: payload.userId };
        next();
    }
    catch (error) {
        console.error("Authentication middleware error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to verify authentication.",
        });
    }
}
