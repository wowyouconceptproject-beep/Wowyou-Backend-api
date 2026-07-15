import {
  Request,
  Response,
} from "express";

import {
  listActivity,
} from "./activity.service";

/*
|--------------------------------------------------------------------------
| Activity Feed
|--------------------------------------------------------------------------
*/

export async function activity(
  req: Request,
  res: Response,
) {
  try {
    const eventId =
  String(req.params.eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message:
          "Event ID is required.",
      });
    }

    const limit =
      Number(req.query.limit) ||
      50;

    const result =
      await listActivity(
        eventId,
        limit,
      );

    return res.json({
      success: true,

      activity:
        result,
    });

  } catch (error: any) {

    return res.status(400).json({
      success: false,

      message:
        error.message,
    });

  }
}