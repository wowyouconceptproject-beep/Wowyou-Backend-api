"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.myEvents = myEvents;
exports.getEvent = getEvent;
exports.publish = publish;
exports.publicEvents = publicEvents;
exports.register = register;
exports.myRegistrations = myRegistrations;
const event_service_1 = require("./event.service");
async function create(req, res) {
    try {
        const event = await (0, event_service_1.createEvent)(req.user.userId, req.body);
        return res.status(201).json({
            success: true,
            event,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function myEvents(req, res) {
    try {
        const events = await (0, event_service_1.getMyEvents)(req.user.userId);
        return res.json({
            success: true,
            events,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function getEvent(req, res) {
    try {
        const event = await (0, event_service_1.getEventById)(req.user.userId, String(req.params.id));
        return res.json({
            success: true,
            event,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function publish(req, res) {
    try {
        const event = await (0, event_service_1.publishEvent)(req.user.userId, String(req.params.id));
        return res.json({
            success: true,
            event,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function publicEvents(_req, res) {
    try {
        const events = await (0, event_service_1.getPublicEvents)();
        return res.json({
            success: true,
            events,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
async function register(req, res) {
    try {
        await (0, event_service_1.registerForEvent)(req.user.userId, String(req.params.id));
        return res.json({
            success: true,
            message: "Registered successfully",
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
async function myRegistrations(req, res) {
    try {
        const events = await (0, event_service_1.getMyRegistrations)(req.user.userId);
        return res.json({
            success: true,
            events,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
