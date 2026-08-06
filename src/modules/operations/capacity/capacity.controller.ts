import {
  Request,
  Response,
} from "express";

import {
  getCapacity,
} from "./capacity.service";

/*
|--------------------------------------------------------------------------
| Event Capacity
|--------------------------------------------------------------------------
*/

export async function capacity(
  req: Request,
  res: Response,
) {
  try {
    const eventId = String(
      req.params.eventId,
    );

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message:
          "Event ID is required.",
      });
    }

    const result =
      await getCapacity(
        eventId,
      );

    return res.json({
      success: true,

      capacity:
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