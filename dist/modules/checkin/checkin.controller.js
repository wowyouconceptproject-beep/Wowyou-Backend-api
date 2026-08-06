"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIn = checkIn;
const checkin_service_1 = require("./checkin.service");
/*
|--------------------------------------------------------------------------
| Check In
|--------------------------------------------------------------------------
*/
async function checkIn(req, res) {
    try {
        const staffId = req.user?.userId;
        if (!staffId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }
        const result = await (0, checkin_service_1.performCheckIn)({
            token: req.body.token,
            scanType: req.body.scanType ??
                "QR",
            station: req.body.station,
            deviceId: req.body.deviceId,
            staffId,
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
