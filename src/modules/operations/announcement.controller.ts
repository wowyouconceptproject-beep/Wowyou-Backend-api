import { Response } from "express";

import { OpsRequest } from "./ops.middleware";

import {
  listAnnouncements,
  createAnnouncement,
  pinAnnouncement,
  deleteAnnouncement,
} from "./announcement.service";

/*
|--------------------------------------------------------------------------
| List Announcements
|--------------------------------------------------------------------------
*/

export async function announcements(
  req: OpsRequest,
  res: Response
) {
  try {
    const limit =
      Number(req.query.limit) ||
      50;

    const result =
      await listAnnouncements(
        req.staff!.eventId,
        limit
      );

    return res.json({
      success: true,

      announcements:
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

/*
|--------------------------------------------------------------------------
| Create Announcement
|--------------------------------------------------------------------------
*/

export async function create(
  req: OpsRequest,
  res: Response
) {
  try {
    const result =
      await createAnnouncement(
        req.staff!.eventId,

        {
          id: req.staff!.id,
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
                  req.body.expiresAt
                )
              : null,
        }
      );

    return res.status(201).json({
      success: true,

      announcement:
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

/*
|--------------------------------------------------------------------------
| Pin / Unpin Announcement
|--------------------------------------------------------------------------
*/

export async function pin(
  req: OpsRequest,
  res: Response
) {
  try {
    const result =
      await pinAnnouncement(
        req.staff!.eventId,

        req.params.id as string,

        Boolean(
          req.body.isPinned
        )
      );

    return res.json({
      success: true,

      announcement:
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

/*
|--------------------------------------------------------------------------
| Delete Announcement
|--------------------------------------------------------------------------
*/

export async function remove(
  req: OpsRequest,
  res: Response
) {
  try {
    const result =
      await deleteAnnouncement(
        req.staff!.eventId,

        req.params.id as string
      );

    return res.json(
      result
    );
  } catch (error: any) {
    return res.status(400).json({
      success: false,

      message:
        error.message,
    });
  }
}