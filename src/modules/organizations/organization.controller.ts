import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  createOrganization,
  getMyOrganization,
} from "./organization.service";

export async function create(
  req: AuthRequest,
  res: Response
) {
  try {
    const { name, slug } =
      req.body;

    const organization =
      await createOrganization(
        req.user!.userId,
        name,
        slug
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

export async function me(
  req: AuthRequest,
  res: Response
) {
  try {
    const organization =
      await getMyOrganization(
        req.user!.userId
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