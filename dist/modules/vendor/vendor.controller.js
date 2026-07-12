"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.myApplications = myApplications;
exports.eventApplications = eventApplications;
exports.approve = approve;
exports.reject = reject;
exports.withdraw = withdraw;
const vendor_service_1 = require("./vendor.service");
const vendor_1 = require("../realtime/vendor");
/*
|--------------------------------------------------------------------------
| Create Vendor Application
|--------------------------------------------------------------------------
*/
async function create(req, res) {
    try {
        const application = await (0, vendor_service_1.createApplication)({
            eventId: req.body.eventId,
            businessName: req.body.businessName,
            category: req.body.category,
            contactName: req.body.contactName,
            email: req.body.email,
            phone: req.body.phone,
            description: req.body.description,
            boothSize: req.body.boothSize,
            message: req.body.message,
        });
        (0, vendor_1.vendorApplicationCreated)({
            eventId: application.eventId,
            application,
        });
        return res.status(201).json({
            success: true,
            application,
        });
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Unable to create application.";
        const status = message ===
            "Event not found."
            ? 404
            : message.includes("already applied")
                ? 409
                : 400;
        return res.status(status).json({
            success: false,
            message,
        });
    }
}
/*
|--------------------------------------------------------------------------
| My Applications
|--------------------------------------------------------------------------
*/
async function myApplications(req, res) {
    try {
        const email = String(req.query.email ?? "");
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }
        const applications = await (0, vendor_service_1.listApplications)(email);
        return res.json({
            success: true,
            applications,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Internal server error.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Event Applications
|--------------------------------------------------------------------------
*/
async function eventApplications(req, res) {
    try {
        const applications = await (0, vendor_service_1.listEventApplications)(String(req.params.eventId));
        return res.json({
            success: true,
            applications,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Internal server error.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Approve Application
|--------------------------------------------------------------------------
*/
async function approve(req, res) {
    try {
        const application = await (0, vendor_service_1.approveApplication)(String(req.params.id));
        (0, vendor_1.vendorApplicationUpdated)({
            eventId: application.eventId,
            application,
        });
        return res.json({
            success: true,
            application,
        });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Application not found.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Reject Application
|--------------------------------------------------------------------------
*/
async function reject(req, res) {
    try {
        const application = await (0, vendor_service_1.rejectApplication)(String(req.params.id));
        (0, vendor_1.vendorApplicationUpdated)({
            eventId: application.eventId,
            application,
        });
        return res.json({
            success: true,
            application,
        });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Application not found.",
        });
    }
}
/*
|--------------------------------------------------------------------------
| Withdraw Application
|--------------------------------------------------------------------------
*/
async function withdraw(req, res) {
    try {
        await (0, vendor_service_1.withdrawApplication)(String(req.params.id));
        return res.json({
            success: true,
            message: "Application withdrawn.",
        });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Application not found.",
        });
    }
}
