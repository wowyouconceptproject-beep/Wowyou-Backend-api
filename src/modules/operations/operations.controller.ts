import { Request, Response } from "express";

import { OpsRequest } from "./ops.middleware";

import {
  access,
} from "./operations.service";

import {
  heartbeat,
  logout,
} from "./session.service";

/*
|--------------------------------------------------------------------------
| Organizer Ops Login
|--------------------------------------------------------------------------
*/

export async function login(
  req: Request,
  res: Response
) {
  try {
    const {
      accessCode,
      deviceId,
      deviceName,
      platform,
      appVersion,
    } = req.body as {
      accessCode: string;
      deviceId?: string;
      deviceName?: string;
      platform?: string;
      appVersion?: string;
    };

    if (!accessCode) {
      return res.status(400).json({
        success: false,
        message: "Access code is required.",
      });
    }

    const result =
      await access(accessCode, {
        deviceId,
        deviceName,
        platform,
        appVersion,
        ipAddress: req.ip,
      });

    return res.status(200).json({
      success: true,
      token: result.token,
      staff: result.staff,
      event: result.event,
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message:
        error.message ||
        "Invalid access code.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Current Staff Session
|--------------------------------------------------------------------------
*/

export async function me(
  req: OpsRequest,
  res: Response
) {
  return res.json({
    success: true,
    staff: req.staff,
  });
}

/*
|--------------------------------------------------------------------------
| Heartbeat
|--------------------------------------------------------------------------
*/

export async function keepAlive(
  req: OpsRequest,
  res: Response
) {
  try {
    if (!req.token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    await heartbeat(req.token);

    return res.json({
      success: true,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

export async function signOut(
  req: OpsRequest,
  res: Response
) {
  try {
    if (!req.token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    await logout(req.token);

    return res.json({
      success: true,
      message:
        "Logged out successfully.",
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}