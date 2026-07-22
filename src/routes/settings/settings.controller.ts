import { Response } from "express";

import { AuthRequest } from "../../modules/auth/auth.middleware";

import {
  getSettings,
  updateSettings,
} from "./settings.service";

export async function attendeeSettings(
  req: AuthRequest,
  res: Response,
) {
  const settings =
    await getSettings(
      req.user!.userId,
    );

  res.json({
    success: true,
    settings,
  });
}

export async function updateAttendeeSettings(
  req: AuthRequest,
  res: Response,
) {
  const settings =
    await updateSettings(
      req.user!.userId,
      req.body,
    );

  res.json({
    success: true,
    message:
      "Settings updated successfully.",
    settings,
  });
}

export async function organizerSettings(
  req: AuthRequest,
  res: Response,
) {
  const settings =
    await getSettings(
      req.user!.userId,
    );

  res.json({
    success: true,
    settings,
  });
}

export async function updateOrganizerSettings(
  req: AuthRequest,
  res: Response,
) {
  const settings =
    await updateSettings(
      req.user!.userId,
      req.body,
    );

  res.json({
    success: true,
    message:
      "Settings updated successfully.",
    settings,
  });
}

export async function vendorSettings(
  req: AuthRequest,
  res: Response,
) {
  const settings =
    await getSettings(
      req.user!.userId,
    );

  res.json({
    success: true,
    settings,
  });
}

export async function updateVendorSettings(
  req: AuthRequest,
  res: Response,
) {
  const settings =
    await updateSettings(
      req.user!.userId,
      req.body,
    );

  res.json({
    success: true,
    message:
      "Settings updated successfully.",
    settings,
  });
}