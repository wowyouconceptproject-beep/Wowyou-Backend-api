import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  getAssignedEvents,
} from "./operations.service";

export async function myEvents(
  req: AuthRequest,
  res: Response
) {
  try {
    const events =
      await getAssignedEvents(
        req.user!.userId
      );

    return res.json({
      success: true,
      events,
    });

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }
}