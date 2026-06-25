import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  createPurchase,
  getMyTickets,
} from "./purchase.service";

export async function create(
  req: AuthRequest,
  res: Response
) {
  try {
    const result =
      await createPurchase(
        req.user!.userId,
        req.body.ticketTypeId,
        Number(
          req.body.quantity
        )
      );

    return res.status(201).json({
      success: true,
      checkoutUrl:
        result.checkoutUrl,
      purchase:
        result.purchase,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

export async function myTickets(
  req: AuthRequest,
  res: Response
) {
  try {
    const tickets =
      await getMyTickets(
        req.user!.userId
      );

    return res.json({
      success: true,
      tickets,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}