import { Response } from "express";

import { OpsRequest } from "./ops.middleware";

import {
    verifyPass,
    checkIn,
    undoCheckIn,
    manualCheckIn,
    searchAttendee,
}
from "./operations.service";

/*
|--------------------------------------------------------------------------
| Verify QR Pass
|--------------------------------------------------------------------------
*/

export async function verify(
  req: OpsRequest,
  res: Response
) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "QR token is required.",
      });
    }

    const result = await verifyPass(
      token,
      req.staff!.eventId
    );

    return res.json({
      success: true,
      ...result,
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
| Check In
|--------------------------------------------------------------------------
*/

export async function scanCheckIn(
  req: OpsRequest,
  res: Response
) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "QR token is required.",
      });
    }

    const result =
      await checkIn(
        token,
        {
          id: req.staff!.id,
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
| Undo Check In
|--------------------------------------------------------------------------
*/

export async function undo(
  req: OpsRequest,
  res: Response
) {
  try {

    const {
      purchaseId,
    } = req.body;

    const result =
      await undoCheckIn(
        purchaseId,
        {
          id: req.staff!.id,
          eventId:
            req.staff!.eventId,
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
| Manual Check In
|--------------------------------------------------------------------------
*/

export async function manual(
  req: OpsRequest,
  res: Response
) {
  try {

    const {
      purchaseId,
    } = req.body;

    const result =
      await manualCheckIn(
        purchaseId,
        {
          id: req.staff!.id,
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
| Search Attendee
|--------------------------------------------------------------------------
*/

export async function search(
  req: OpsRequest,
  res: Response
) {
  try {

    const { query } =
      req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message:
          "Search query is required.",
      });
    }

    const attendees =
      await searchAttendee(
        req.staff!.eventId,
        query
      );

    return res.json({
      success: true,
      attendees,
    });

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message:
        error.message,
    });

  }
}