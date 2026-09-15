import type {
  Request,
  Response,
} from "express";

import {
  getEventPulse,
} from "./pulse.service";

import {
  getEventHeatmap,
} from "./heatmap.service";

/*
|--------------------------------------------------------------------------
| Sentient Pulse
|--------------------------------------------------------------------------
*/

export async function getPulse(
  req: Request,
  res: Response,
) {
  try {
    const eventId =
      String(
        req.params.eventId ||
          "",
      ).trim();

    if (!eventId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "eventId is required.",
        });
    }

    const pulse =
      await getEventPulse(
        eventId,
      );

    return res.json({
      success: true,

      pulse,
    });
  } catch (error) {
    console.error(
      "Event pulse error:",
      error,
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to calculate event pulse.",
      });
  }
}

/*
|--------------------------------------------------------------------------
| Heatmap
|--------------------------------------------------------------------------
*/

export async function getHeatmap(
  req: Request,
  res: Response,
) {
  try {
    const eventId =
      String(
        req.params.eventId ||
          "",
      ).trim();

    if (!eventId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "eventId is required.",
        });
    }

    const heatmap =
      await getEventHeatmap(
        eventId,
      );

    return res.json({
      success: true,

      heatmap,
    });
  } catch (error) {
    console.error(
      "Event heatmap error:",
      error,
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to calculate event heatmap.",
      });
  }
}