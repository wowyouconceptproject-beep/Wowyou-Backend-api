"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.me = me;
exports.keepAlive = keepAlive;
exports.signOut = signOut;
const operations_service_1 = require("./operations.service");
const session_service_1 = require("./session.service");
/*
|--------------------------------------------------------------------------
| Organizer Ops Login
|--------------------------------------------------------------------------
*/
async function login(req, res) {
    try {
        const { accessCode, deviceId, deviceName, platform, appVersion, } = req.body;
        if (!accessCode) {
            return res.status(400).json({
                success: false,
                message: "Access code is required.",
            });
        }
        const result = await (0, operations_service_1.access)(accessCode, {
            deviceId,
            deviceName,
            platform,
            appVersion,
            ipAddress: req.ip,
        });
        return res.status(200).json({
            success: true,
            token: result.token,
            staff: result.staff,
            event: result.event,
        });
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message ||
                "Invalid access code.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Current Staff Session
|--------------------------------------------------------------------------
*/
async function me(req, res) {
    return res.json({
        success: true,
        staff: req.staff,
    });
}
/*
|--------------------------------------------------------------------------
| Heartbeat
|--------------------------------------------------------------------------
*/
async function keepAlive(req, res) {
    try {
        if (!req.token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }
        await (0, session_service_1.heartbeat)(req.token);
        return res.json({
            success: true,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/
async function signOut(req, res) {
    try {
        if (!req.token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }
        await (0, session_service_1.logout)(req.token);
        return res.json({
            success: true,
            message: "Logged out successfully.",
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
