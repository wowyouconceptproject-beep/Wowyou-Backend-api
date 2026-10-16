import { Request, Response } from "express";

import { OpsRequest } from "./ops.middleware";

import {
  heartbeat,
  logout,
} from "./session.service";

import {
  access,
  dashboard,
  verifyPass,
  checkIn,
  manualCheckIn,
  searchAttendee,
  undoCheckIn,
} from "./operations.service";

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
  console.error(
    "OPERATIONS LOGIN ERROR:",
    error
  );

  return res.status(401).json({
    success: false,
    message:
      error?.message ||
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

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

export async function getDashboard(
  req: OpsRequest,
  res: Response
) {
  try {

    const data =
      await dashboard(
        req.staff!.eventId
      );

    return res.json({
      success: true,
      dashboard: data,
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
| Scan QR Pass
|--------------------------------------------------------------------------
*/

export async function scan(
  req: OpsRequest,
  res: Response
) {
  try {

    const { token } =
      req.body as {
        token: string;
      };

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "QR token is required.",
      });
    }

    const result =
      await checkIn(
        token,
        {
          id:
            req.staff!.id,

          eventId:
            req.staff!.eventId,

          station:
            req.staff!.station,
        }
      );

    return res.json(result);

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
| Event Reports
|--------------------------------------------------------------------------
*/

export async function getReports(
  req: OpsRequest,
  res: Response,
) {
  try {
    const eventId = req.staff?.eventId;

    if (!eventId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated event session is required.",
      });
    }

    const data = await dashboard(eventId);

    const checkedIn = data.attendance.checkedIn;
    const totalTickets = data.attendance.totalTickets;

    const attendanceRate =
      totalTickets > 0
        ? Number(((checkedIn / totalTickets) * 100).toFixed(2))
        : 0;

    return res.json({
      success: true,
      report: {
        event: data.event,
        attendance: {
          checkedIn,
          totalTickets,
          remaining: data.attendance.remaining,
          capacity: data.attendance.capacity,
          attendanceRate,
        },
        onlineStaff: data.onlineStaff,
        recentActivity: data.recentActivity,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate event reports.";

    return res.status(400).json({
      success: false,
      message,
    });
  }
}