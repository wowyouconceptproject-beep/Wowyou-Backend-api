import {
  Response,
} from "express";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  listAnnouncements,
  createAnnouncement,
  pinAnnouncement,
  deleteAnnouncement,
} from "./announcement.service";

/*
|--------------------------------------------------------------------------
| Resolve Event
|--------------------------------------------------------------------------
*/

function resolveEventId(
  req: AuthRequest,
) {
  return req.params.eventId as string;
}

/*
|--------------------------------------------------------------------------
| List Announcements
|--------------------------------------------------------------------------
*/

export async function announcements(
  req: AuthRequest,
  res: Response,
) {
  try {
    const eventId =
      resolveEventId(req);

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
      await listAnnouncements(
        eventId,
        limit,
      );

    return res.json({
      success: true,
      announcements: result,
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
| Create Announcement
|--------------------------------------------------------------------------
*/

export async function create(
  req: AuthRequest,
  res: Response,
) {
  try {
    const eventId =
      resolveEventId(req);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message:
          "Event ID is required.",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized.",
      });
    }

    const result =
      await createAnnouncement(
        eventId,

        {
          id:
            req.user.userId,
        },

        {
          title:
            req.body.title,

          message:
            req.body.message,

          type:
            req.body.type,

          priority:
            req.body.priority,

          audience:
            req.body.audience,

          isPinned:
            req.body.isPinned,

          expiresAt:
            req.body.expiresAt
              ? new Date(
                  req.body.expiresAt,
                )
              : null,
        },
      );

    return res.status(201).json({
      success: true,
      announcement: result,
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
| Pin / Unpin Announcement
|--------------------------------------------------------------------------
*/

export async function pin(
  req: AuthRequest,
  res: Response,
) {
  try {
    const eventId =
      resolveEventId(req);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message:
          "Event ID is required.",
      });
    }

    const result =
      await pinAnnouncement(
        eventId,
        req.params.id as string,
        Boolean(
          req.body.isPinned,
        ),
      );

    return res.json({
      success: true,
      announcement: result,
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
| Delete Announcement
|--------------------------------------------------------------------------
*/

export async function remove(
  req: AuthRequest,
  res: Response,
) {
  try {
    const eventId =
      resolveEventId(req);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message:
          "Event ID is required.",
      });
    }

    const result =
      await deleteAnnouncement(
        eventId,
        req.params.id as string,
      );

    return res.json(
      result,
    );

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message:
        error.message,
    });

  }
}