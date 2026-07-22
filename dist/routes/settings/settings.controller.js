"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendeeSettings = attendeeSettings;
exports.updateAttendeeSettings = updateAttendeeSettings;
exports.organizerSettings = organizerSettings;
exports.updateOrganizerSettings = updateOrganizerSettings;
exports.vendorSettings = vendorSettings;
exports.updateVendorSettings = updateVendorSettings;
const settings_service_1 = require("./settings.service");
async function attendeeSettings(req, res) {
    const settings = await (0, settings_service_1.getSettings)(req.user.userId);
    res.json({
        success: true,
        settings,
    });
}
async function updateAttendeeSettings(req, res) {
    const settings = await (0, settings_service_1.updateSettings)(req.user.userId, req.body);
    res.json({
        success: true,
        message: "Settings updated successfully.",
        settings,
    });
}
async function organizerSettings(req, res) {
    const settings = await (0, settings_service_1.getSettings)(req.user.userId);
    res.json({
        success: true,
        settings,
    });
}
async function updateOrganizerSettings(req, res) {
    const settings = await (0, settings_service_1.updateSettings)(req.user.userId, req.body);
    res.json({
        success: true,
        message: "Settings updated successfully.",
        settings,
    });
}
async function vendorSettings(req, res) {
    const settings = await (0, settings_service_1.getSettings)(req.user.userId);
    res.json({
        success: true,
        settings,
    });
}
async function updateVendorSettings(req, res) {
    const settings = await (0, settings_service_1.updateSettings)(req.user.userId, req.body);
    res.json({
        success: true,
        message: "Settings updated successfully.",
        settings,
    });
}
