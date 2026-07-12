"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discovery = discovery;
const discovery_service_1 = require("./discovery.service");
async function discovery(req, res) {
    try {
        const result = await (0, discovery_service_1.getDiscoveryFeed)();
        return res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
