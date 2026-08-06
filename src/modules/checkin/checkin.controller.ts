import {
  Response,
} from "express";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  performCheckIn,
} from "./checkin.service";

/*
|--------------------------------------------------------------------------
| Check In
|--------------------------------------------------------------------------
*/

export async function checkIn(
  req: AuthRequest,
  res: Response,
) {
  try {
    const staffId =
      req.user?.userId;

    if (!staffId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const result =
      await performCheckIn({
        token:
          req.body.token,

        scanType:
          req.body.scanType ??
          "QR",

        station:
          req.body.station,

        deviceId:
          req.body.deviceId,

        staffId,
      });

    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}