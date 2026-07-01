import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  createStaff,
  listStaff,
  getStaff,
  regenerateAccessCode,
  disableStaff,
} from "./staff.service";

/*
|--------------------------------------------------------------------------
| Create Staff
|--------------------------------------------------------------------------
*/

export async function create(
  req: AuthRequest,
  res: Response
) {
  try {
    const result =
      await createStaff(
        req.user!.userId,
        String(req.params.eventId),
        req.body
      );

    return res.status(201).json({
      success: true,
      staff: result.staff,
      accessCode:
        result.accessCode,
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
| List Staff
|--------------------------------------------------------------------------
*/

export async function list(
  req: AuthRequest,
  res: Response
) {
  try {

    const staff =
      await listStaff(
        req.user!.userId,
        String(req.params.eventId)
      );

    return res.json({
      success: true,
      staff,
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
| Get Staff
|--------------------------------------------------------------------------
*/

export async function get(
  req: AuthRequest,
  res: Response
) {
  try {

    const staff =
      await getStaff(
        req.user!.userId,
        String(req.params.staffId)
      );

    return res.json({
      success: true,
      staff,
    });

  } catch (error: any) {

    return res.status(404).json({
      success: false,
      message:
        error.message,
    });

  }
}

/*
|--------------------------------------------------------------------------
| Regenerate Access Code
|--------------------------------------------------------------------------
*/

export async function regenerate(
  req: AuthRequest,
  res: Response
) {
  try {

    const result =
      await regenerateAccessCode(
        req.user!.userId,
        String(req.params.staffId)
      );

    return res.json({
      success: true,

      staff:
        result.staff,

      accessCode:
        result.accessCode,
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
| Disable Staff
|--------------------------------------------------------------------------
*/

export async function disable(
  req: AuthRequest,
  res: Response
) {
  try {

    await disableStaff(
      req.user!.userId,
      String(req.params.staffId)
    );

    return res.json({
      success: true,
      message:
        "Staff disabled successfully.",
    });

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message:
        error.message,
    });

  }
}