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

/*
|--------------------------------------------------------------------------
| Generate Secure Pass
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Verify Pass
|--------------------------------------------------------------------------
*/

export async function verifyPass(
  req: AuthRequest,
  res: Response
) {
  try {
    const result =
      await verifySecurePass(
        req.body.token
      );

    const purchase =
      result.purchase;

    return res.json({
      success: true,

      attendee: {
        id: purchase.user.id,
        name: `${purchase.user.firstName} ${purchase.user.lastName}`,
        email: purchase.user.email,
      },

      ticket: {
        id: purchase.ticket.id,
        name: purchase.ticket.name,
      },

      event: {
        id: purchase.event.id,
        title: purchase.event.title,
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