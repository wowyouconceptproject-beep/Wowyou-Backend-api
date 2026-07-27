import {
  Request,
  Response,
} from "express";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  createEvent,
  getMyEvents,
  getEventById,
  getPublicEventById,
  publishEvent,
  getPublicEvents,
  registerForEvent,
  getMyRegistrations,
} from "./event.service";

import {
  getEventAttendees,
} from "./attendees.service";

/**
 * |--------------------------------------------------------------------------
 * | Create Event
 * |--------------------------------------------------------------------------
 */

export async function create(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      title,
      description,

      venue,
      venueAddress,
      city,
      country,

      coverImage,
      category,

      capacity,
      currency,

      startDate,
      endDate,

      isPublic,
    } = req.body;

    const event =
      await createEvent(
        req.user!.userId,
        {
          title,
          description,

          venue,
          venueAddress,
          city,
          country,

          coverImage,
          category,

          capacity,
          currency,

          startDate,
          endDate,

          isPublic,
        }
      );

    return res.status(201).json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error(
      "CREATE EVENT ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

/**
 * |--------------------------------------------------------------------------
 * | Organizer Events
 * |--------------------------------------------------------------------------
 */

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

/**
 * |--------------------------------------------------------------------------
 * | Single Organizer Event
 * |--------------------------------------------------------------------------
 */

export async function getEvent(
  req: AuthRequest,
  res: Response
) {
  try {
    const event =
      await getEventById(
        req.user!.userId,
        String(
          req.params.id
        )
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

/**
 * |--------------------------------------------------------------------------
 * | Publish Event
 * |--------------------------------------------------------------------------
 */

export async function publish(
  req: AuthRequest,
  res: Response
) {
  try {
    const event =
      await publishEvent(
        req.user!.userId,
        String(
          req.params.id
        )
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

export async function getPublicEvent(
  req: Request,
  res: Response,
) {
  try {
    const event =
      await getPublicEventById(
        String(req.params.id),
      );

    return res.json({
      success: true,
      event,
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,

      message:
        error.message,
    });
  }
}

/**
 * |--------------------------------------------------------------------------
 * | Public Events
 * |--------------------------------------------------------------------------
 */

export async function publicEvents(
  _req: Request,
  res: Response
) {
  try {
    const events =
      await getPublicEvents();

    return res.json({
      success: true,
      events,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

/**
 * |--------------------------------------------------------------------------
 * | Register For Event
 * |--------------------------------------------------------------------------
 */

export async function register(
  req: AuthRequest,
  res: Response
) {
  try {
    await registerForEvent(
      req.user!.userId,
      String(
        req.params.id
      )
    );

    return res.json({
      success: true,
      message:
        "Registered successfully",
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

/**
 * |--------------------------------------------------------------------------
 * | My Registrations
 * |--------------------------------------------------------------------------
 */

export async function myRegistrations(
  req: AuthRequest,
  res: Response
) {
  try {
    const events =
      await getMyRegistrations(
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

/**
 * |--------------------------------------------------------------------------
 * | Event Attendees
 * |--------------------------------------------------------------------------
 */

export async function attendees(
  req: AuthRequest,
  res: Response
) {
  try {
    const attendees =
      await getEventAttendees(
        req.user!.userId,
        req.params
          .eventId as string
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