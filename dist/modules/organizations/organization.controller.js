"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.me = me;
const client_1 = require("@prisma/client");
const organization_service_1 = require("./organization.service");
const billing_service_1 = require("../billing/billing.service");
/*
|--------------------------------------------------------------------------
| Create Organization
|--------------------------------------------------------------------------
*/
async function create(req, res) {
    try {
        const { name, slug, plan, } = req.body;
        /*
        |--------------------------------------------------------------------------
        | Validate Plan
        |--------------------------------------------------------------------------
        */
        const selectedPlan = plan ??
            client_1.OrganizerPlan.STARTER;
        if (!(0, billing_service_1.getPlan)(selectedPlan)) {
            return res.status(400).json({
                success: false,
                message: "Invalid organizer plan.",
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Create Organization + Trial
        |--------------------------------------------------------------------------
        */
        const organization = await (0, organization_service_1.createOrganization)(req.user.userId, name, slug, selectedPlan);
        return res.status(201).json({
            success: true,
            organization,
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
| My Organization
|--------------------------------------------------------------------------
*/
async function me(req, res) {
    try {
        const organization = await (0, organization_service_1.getMyOrganization)(req.user.userId);
        return res.json({
            success: true,
            organization,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
