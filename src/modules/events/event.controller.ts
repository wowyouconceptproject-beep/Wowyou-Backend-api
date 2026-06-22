import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  createEvent,
  getMyEvents,
} from "./event.service";

export async function create(
  req: AuthRequest,
  res: Response
) {
  try {
    const event =
      await createEvent(
        req.user!.userId,
        req.body
      );

    return res.status(201).json({
      success: true,
      event,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

export async function myEvents(
  req: AuthRequest,
  res: Response
) {
  try {
    const events =
      await getMyEvents(
        req.user!.userId
      );

    return res.json({
      success: true,
      events,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}