import { Response } from "express";

import {
  OrganizerPlan,
} from "@prisma/client";

import {
  AuthRequest,
} from "../auth/auth.middleware";

import {
  createOrganization,
  getMyOrganization,
} from "./organization.service";

import {
  getPlan,
} from "../billing/billing.service";

/*
|--------------------------------------------------------------------------
| Create Organization
|--------------------------------------------------------------------------
*/

export async function create(
  req: AuthRequest,
  res: Response,
) {
  try {
    const {
      name,
      slug,
      plan,
    } = req.body as {
      name: string;
      slug: string;
      plan?: OrganizerPlan;
    };

    /*
    |--------------------------------------------------------------------------
    | Validate Plan
    |--------------------------------------------------------------------------
    */

    const selectedPlan =
      plan ??
      OrganizerPlan.STARTER;

    if (
      !getPlan(
        selectedPlan,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid organizer plan.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Organization + Trial
    |--------------------------------------------------------------------------
    */

    const organization =
      await createOrganization(
        req.user!.userId,
        name,
        slug,
        selectedPlan,
      );

    return res.status(201).json({
      success: true,
      organization,
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
| My Organization
|--------------------------------------------------------------------------
*/

export async function me(
  req: AuthRequest,
  res: Response,
) {
  try {
    const organization =
      await getMyOrganization(
        req.user!.userId,
      );

    return res.json({
      success: true,
      organization,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}