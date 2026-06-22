import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  createProfile,
  getMyProfile,
  updateProfile,
} from "./attendee-profile.service";

export async function create(
  req: AuthRequest,
  res: Response
) {
  try {
    const profile =
      await createProfile(
        req.user!.userId,
        req.body
      );

    return res.status(201).json({
      success: true,
      profile,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

export async function me(
  req: AuthRequest,
  res: Response
) {
  try {
    const profile =
      await getMyProfile(
        req.user!.userId
      );

    return res.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

export async function update(
  req: AuthRequest,
  res: Response
) {
  try {
    const profile =
      await updateProfile(
        req.user!.userId,
        req.body
      );

    return res.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}