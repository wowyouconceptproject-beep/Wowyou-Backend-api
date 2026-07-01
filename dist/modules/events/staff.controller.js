"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.list = list;
exports.get = get;
exports.regenerate = regenerate;
exports.disable = disable;
const staff_service_1 = require("./staff.service");
/*
|--------------------------------------------------------------------------
| Create Staff
|--------------------------------------------------------------------------
*/
async function create(req, res) {
    try {
        const result = await (0, staff_service_1.createStaff)(req.user.userId, String(req.params.eventId), req.body);
        return res.status(201).json({
            success: true,
            staff: result.staff,
            accessCode: result.accessCode,
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
| List Staff
|--------------------------------------------------------------------------
*/
async function list(req, res) {
    try {
        const staff = await (0, staff_service_1.listStaff)(req.user.userId, String(req.params.eventId));
        return res.json({
            success: true,
            staff,
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
| Get Staff
|--------------------------------------------------------------------------
*/
async function get(req, res) {
    try {
        const staff = await (0, staff_service_1.getStaff)(req.user.userId, String(req.params.staffId));
        return res.json({
            success: true,
            staff,
        });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| Regenerate Access Code
|--------------------------------------------------------------------------
*/
async function regenerate(req, res) {
    try {
        const result = await (0, staff_service_1.regenerateAccessCode)(req.user.userId, String(req.params.staffId));
        return res.json({
            success: true,
            staff: result.staff,
            accessCode: result.accessCode,
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
| Disable Staff
|--------------------------------------------------------------------------
*/
async function disable(req, res) {
    try {
        await (0, staff_service_1.disableStaff)(req.user.userId, String(req.params.staffId));
        return res.json({
            success: true,
            message: "Staff disabled successfully.",
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
