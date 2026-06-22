"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
exports.me = me;
const organization_service_1 = require("./organization.service");
async function create(req, res) {
    try {
        const { name, slug } = req.body;
        const organization = await (0, organization_service_1.createOrganization)(req.user.userId, name, slug);
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
