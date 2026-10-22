"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
const node_fs_1 = require("node:fs");
function initializeFirebaseAdmin() {
    if ((0, app_1.getApps)().length > 0) {
        return;
    }
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
        const serviceAccount = JSON.parse((0, node_fs_1.readFileSync)(serviceAccountPath, "utf8"));
        (0, app_1.initializeApp)({
            credential: (0, app_1.cert)(serviceAccount),
        });
        return;
    }
    // Supports Application Default Credentials in environments
    // where Firebase credentials have been configured securely.
    (0, app_1.initializeApp)({
        credential: (0, app_1.applicationDefault)(),
    });
}
async function sendPushNotification(input) {
    const tokens = [
        ...new Set(input.tokens
            .map((token) => token.trim())
            .filter(Boolean)),
    ];
    if (tokens.length === 0) {
        return {
            successCount: 0,
            failureCount: 0,
            invalidTokens: [],
        };
    }
    initializeFirebaseAdmin();
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = [];
    // FCM multicast requests support up to 500 tokens each.
    for (let index = 0; index < tokens.length; index += 500) {
        const batch = tokens.slice(index, index + 500);
        const message = {
            tokens: batch,
            notification: {
                title: input.title,
                body: input.body,
            },
            data: input.data,
        };
        const response = await (0, messaging_1.getMessaging)().sendEachForMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;
        response.responses.forEach((result, resultIndex) => {
            if (result.success) {
                return;
            }
            const errorCode = result.error?.code;
            if (errorCode === "messaging/invalid-registration-token" ||
                errorCode === "messaging/registration-token-not-registered") {
                invalidTokens.push(batch[resultIndex]);
            }
            console.error("FCM delivery failed:", {
                code: errorCode,
                message: result.error?.message,
            });
        });
    }
    return {
        successCount,
        failureCount,
        invalidTokens,
    };
}
