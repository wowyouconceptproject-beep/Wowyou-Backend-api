import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  generateSecurePass,
  getEventPass,
} from "./pass.service";

export async function getPass(
  req: AuthRequest,
  res: Response
) {
  try {
    const pass =
      await getEventPass(
        req.params.purchaseId as string,
        req.user!.userId
      );

    return res.json({
      success: true,
      pass,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function securePass(
  req: AuthRequest,
  res: Response
) {
  try {
    const result =
      await generateSecurePass(
        req.params.purchaseId as string,
        req.user!.userId
      );

    return res.json({
      success: true,
      token: result.token,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}