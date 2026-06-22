import { Request, Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  createEvent,
  getMyEvents,
  getEventById,
  publishEvent,
  getPublicEvents,
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

export async function getEvent(
  req: AuthRequest,
  res: Response
) {
  try {
    const event =
  await getEventById(
    req.user!.userId,
    String(req.params.id)
  );

    return res.json({
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

export async function publish(
  req: AuthRequest,
  res: Response
) {
  try {
    const event =
      await publishEvent(
        req.user!.userId,
        String(req.params.id)
      );

    return res.json({
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

export async function publicEvents(
  _req: Request,
  res: Response
) {
  const events =
    await getPublicEvents();

  return res.json({
    success: true,
    events,
  });
}