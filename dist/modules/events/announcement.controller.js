"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcements = announcements;
exports.create = create;
exports.pin = pin;
exports.remove = remove;
const announcement_service_1 = require("./announcement.service");
/*
|--------------------------------------------------------------------------
| Resolve Event
|--------------------------------------------------------------------------
*/
function resolveEventId(req) {
    return req.params.eventId;
}
/*
|--------------------------------------------------------------------------
| List Announcements
|--------------------------------------------------------------------------
*/
async function announcements(req, res) {
    try {
        const eventId = resolveEventId(req);
        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: "Event ID is required.",
            });
        }
        const limit = Number(req.query.limit) ||
            50;
        const result = await (0, announcement_service_1.listAnnouncements)(eventId, limit);
        return res.json({
            success: true,
            announcements: result,
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
| Create Announcement
|--------------------------------------------------------------------------
*/
async function create(req, res) {
    try {
        const eventId = resolveEventId(req);
        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: "Event ID is required.",
            });
        }
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }
        const result = await (0, announcement_service_1.createAnnouncement)(eventId, {
            id: req.user.userId,
        }, {
            title: req.body.title,
            message: req.body.message,
            type: req.body.type,
            priority: req.body.priority,
            audience: req.body.audience,
            isPinned: req.body.isPinned,
            expiresAt: req.body.expiresAt
                ? new Date(req.body.expiresAt)
                : null,
        });
        return res.status(201).json({
            success: true,
            announcement: result,
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
| Pin / Unpin Announcement
|--------------------------------------------------------------------------
*/
async function pin(req, res) {
    try {
        const eventId = resolveEventId(req);
        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: "Event ID is required.",
            });
        }
        const result = await (0, announcement_service_1.pinAnnouncement)(eventId, req.params.id, Boolean(req.body.isPinned));
        return res.json({
            success: true,
            announcement: result,
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
| Delete Announcement
|--------------------------------------------------------------------------
*/
async function remove(req, res) {
    try {
        const eventId = resolveEventId(req);
        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: "Event ID is required.",
            });
        }
        const result = await (0, announcement_service_1.deleteAnnouncement)(eventId, req.params.id);
        return res.json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
