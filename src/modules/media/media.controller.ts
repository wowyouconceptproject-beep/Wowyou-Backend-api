import {
  Response,
} from "express";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  uploadEventCoverImage,
} from "./media.service";

export async function uploadEventCover(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Event cover image is required.",
        });
    }

    const image =
      await uploadEventCoverImage(
        req.file
      );

    return res
      .status(201)
      .json({
        success: true,

        image: {
          url:
            image.url,

          publicId:
            image.publicId,

          width:
            image.width,

          height:
            image.height,
        },
      });
  } catch (error: any) {
    console.error(
      "EVENT COVER UPLOAD ERROR:",
      error
    );

    return res
      .status(400)
      .json({
        success: false,
        message:
          error?.message ??
          "Unable to upload event cover.",
      });
  }
}