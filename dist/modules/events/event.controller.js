"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.myEvents = myEvents;
exports.getEvent = getEvent;
exports.publish = publish;
exports.getPublicEvent = getPublicEvent;
exports.publicEvents = publicEvents;
exports.register = register;
exports.myRegistrations = myRegistrations;
exports.attendees = attendees;
const event_service_1 = require("./event.service");
const attendees_service_1 = require("./attendees.service");
/**
 * |--------------------------------------------------------------------------
 * | Create Event
 * |--------------------------------------------------------------------------
 */
async function create(req, res) {
    try {
        const { title, description, venue, venueAddress, venueLatitude, venueLongitude, city, country, coverImage, category, capacity, currency, startDate, endDate, isPublic, } = req.body;
        const event = await (0, event_service_1.createEvent)(req.user.userId, {
            title,
            description,
            venue,
            venueAddress,
            venueLatitude: venueLatitude !== undefined &&
                venueLatitude !== null
                ? Number(venueLatitude)
                : undefined,
            venueLongitude: venueLongitude !== undefined &&
                venueLongitude !== null
                ? Number(venueLongitude)
                : undefined,
            city,
            country,
            coverImage,
            category,
            capacity,
            currency,
            startDate,
            endDate,
            isPublic,
        });
        return res.status(201).json({
            success: true,
            event,
        });
    }
    catch (error) {
        console.error("CREATE EVENT ERROR:", error);
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/**
 * |--------------------------------------------------------------------------
 * | Organizer Events
 * |--------------------------------------------------------------------------
 */
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
/**
 * |--------------------------------------------------------------------------
 * | Single Organizer Event
 * |--------------------------------------------------------------------------
 */
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
/**
 * |--------------------------------------------------------------------------
 * | Publish Event
 * |--------------------------------------------------------------------------
 */
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
async function getPublicEvent(req, res) {
    try {
        const event = await (0, event_service_1.getPublicEventById)(String(req.params.id));
        return res.json({
            success: true,
            event,
        });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message,
        });
    }
}
/**
 * |--------------------------------------------------------------------------
 * | Public Events
 * |--------------------------------------------------------------------------
 */
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
/**
 * |--------------------------------------------------------------------------
 * | Register For Event
 * |--------------------------------------------------------------------------
 */
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
/**
 * |--------------------------------------------------------------------------
 * | My Registrations
 * |--------------------------------------------------------------------------
 */
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
/**
 * |--------------------------------------------------------------------------
 * | Event Attendees
 * |--------------------------------------------------------------------------
 */
async function attendees(req, res) {
    try {
        const attendees = await (0, attendees_service_1.getEventAttendees)(req.user.userId, req.params
            .eventId);
        return res.json({
            success: true,
            attendees,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
