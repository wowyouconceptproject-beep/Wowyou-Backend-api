import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  generateSecurePass,
  getEventPass,
  verifySecurePass,
} from "./pass.service";

/*
|--------------------------------------------------------------------------
| Get Pass
|--------------------------------------------------------------------------
*/

export async function getPass(
  req: AuthRequest,
  res: Response,
) {
  try {
    const purchase =
      await getEventPass(
        req.params.purchaseId as string,
        req.user!.userId,
      );

    return res.json({
      success: true,

      purchase,

      passes:
        purchase.passes,
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
| Generate Secure Pass
|--------------------------------------------------------------------------
*/

export async function securePass(
  req: AuthRequest,
  res: Response,
) {
  try {
    const result =
      await generateSecurePass(
        req.params.purchaseId as string,
        req.user!.userId,
      );

    return res.json({
      success: true,

      purchase:
        result.purchase,

      passes:
        result.passes,
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
| Verify Pass
|--------------------------------------------------------------------------
*/

export async function verifyPass(
  req: AuthRequest,
  res: Response,
) {
  try {
    const result =
      await verifySecurePass(
        req.body.token,
      );

    return res.json({
      success: true,

      attendee:
        result.attendee,

      ticket:
        result.ticket,

      event:
        result.event,

      pass: {
        id:
          result.pass.id,

        passNumber:
          result.pass.passNumber,

        qrToken:
          result.pass.qrToken,

        nfcToken:
          result.pass.nfcToken,

        active:
          result.pass.isActive,

        revoked:
          result.pass.isRevoked,

        nfcEnabled:
          result.pass.nfcEnabled,

        issuedAt:
          result.pass.issuedAt,

        expiresAt:
          result.pass.expiresAt,
      },

      alreadyCheckedIn:
        result.alreadyCheckedIn,

      checkedInBy:
        result.checkedInBy,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,

      message:
        error.message,
    });
  }
}