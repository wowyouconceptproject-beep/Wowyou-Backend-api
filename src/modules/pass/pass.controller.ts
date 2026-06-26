import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  generateSecurePass,
  getEventPass,
} from "./pass.service";

import {
  verifySecurePass,
} from "./pass.service";

import {
  checkInPass,
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

export async function verifyPass(
  req: AuthRequest,
  res: Response
) {
  try {
    const result =
      await verifySecurePass(
        req.body.token
      );

    return res.json({
      success: true,

      attendee: {
        id: result.purchase.user.id,

        name:
          `${result.purchase.user.firstName} ${result.purchase.user.lastName}`,

        email:
          result.purchase.user.email,
      },

      ticket: {
        id:
          result.purchase.ticket.id,

        name:
          result.purchase.ticket.name,
      },

      event: {
        id:
          result.purchase.event.id,

        title:
          result.purchase.event.title,
      },

      alreadyCheckedIn:
        result.alreadyCheckedIn,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

export async function checkIn(
  req: AuthRequest,
  res: Response
) {
  try {
    const result =
      await checkInPass(
        req.body.token,
        req.user!.userId
      );

    return res.json({
      success: true,

      attendance:
        result.attendance,

      attendee:
        `${result.purchase.userId}`,

      message:
        "Attendee checked in successfully.",
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}