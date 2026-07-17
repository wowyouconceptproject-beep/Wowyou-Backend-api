import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  createProfile,
  getMyProfile,
  updateProfile,
} from "./attendee-profile.service";

/*
|--------------------------------------------------------------------------
| Create Profile
|--------------------------------------------------------------------------
*/

export async function create(
  req: AuthRequest,
  res: Response,
) {
  try {
    const profile =
      await createProfile(
        req.user!.userId,
        {
          profession:
            req.body.profession,

          industry:
            req.body.industry,

          company:
            req.body.company,

          jobTitle:
            req.body.jobTitle,

          linkedin:
            req.body.linkedin,

          goals:
            req.body.goals,

          skills:
            req.body.skills,

          bio:
            req.body.bio,
        },
      );

    return res.status(201).json({
      success: true,
      profile,
    });

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }
}

/*
|--------------------------------------------------------------------------
| My Profile
|--------------------------------------------------------------------------
*/

export async function me(
  req: AuthRequest,
  res: Response,
) {
  try {
    const profile =
      await getMyProfile(
        req.user!.userId,
      );

    return res.json({
      success: true,
      profile,
    });

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }
}

/*
|--------------------------------------------------------------------------
| Update Profile
|--------------------------------------------------------------------------
*/

export async function update(
  req: AuthRequest,
  res: Response,
) {
  try {
    const profile =
      await updateProfile(
        req.user!.userId,
        {
          profession:
            req.body.profession,

          industry:
            req.body.industry,

          company:
            req.body.company,

          jobTitle:
            req.body.jobTitle,

          linkedin:
            req.body.linkedin,

          goals:
            req.body.goals,

          skills:
            req.body.skills,

          bio:
            req.body.bio,
        },
      );

    return res.json({
      success: true,
      profile,
    });

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }
}