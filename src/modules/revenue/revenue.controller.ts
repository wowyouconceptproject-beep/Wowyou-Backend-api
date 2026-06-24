import {
  Request,
  Response,
} from "express";

import {
  getEventRevenue,
} from "./revenue.service";

export async function eventRevenue(
  req: Request,
  res: Response
) {
  try {
    const revenue =
      await getEventRevenue(
        req.params
          .eventId as string
      );

    return res.json({
      success: true,
      revenue,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}