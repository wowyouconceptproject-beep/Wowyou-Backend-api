"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.me = me;
exports.keepAlive = keepAlive;
exports.signOut = signOut;
exports.getDashboard = getDashboard;
exports.scan = scan;
const session_service_1 = require("./session.service");
const operations_service_1 = require("./operations.service");
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
/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/
async function getDashboard(req, res) {
    try {
        const data = await (0, operations_service_1.dashboard)(req.staff.eventId);
        return res.json({
            success: true,
            dashboard: data,
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
| Scan QR Pass
|--------------------------------------------------------------------------
*/
async function scan(req, res) {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "QR token is required.",
            });
        }
        const result = await (0, operations_service_1.checkIn)(token, {
            id: req.staff.id,
            eventId: req.staff.eventId,
            station: req.staff.station,
        });
        return res.json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
