import { Response } from "express";

import { OpsRequest } from "./ops.middleware";

import {
  listActivity,
} from "./activity.service";

/*
|--------------------------------------------------------------------------
| Activity Feed
|--------------------------------------------------------------------------
*/

export async function activity(
  req: OpsRequest,
  res: Response
) {
  try {

    const limit =
      Number(req.query.limit) ||
      50;

    const result =
      await listActivity(
        req.staff!.eventId,
        limit
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