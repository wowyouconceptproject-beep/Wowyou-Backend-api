import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
  createPurchase,
  getMyTickets,
  getMyEvents,
  getMyEvent as getMyEventService,
} from "./purchase.service";

/*
|--------------------------------------------------------------------------
| Create Purchase
|--------------------------------------------------------------------------
*/

export async function create(
  req: AuthRequest,
  res: Response,
) {
  try {
    const result =
      await createPurchase(
        req.user!.userId,
        req.body.ticketTypeId,
        Number(req.body.quantity),
      );

    return res.status(201).json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      purchase: result.purchase,
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
| Legacy Tickets
|--------------------------------------------------------------------------
*/

export async function myTickets(
  req: AuthRequest,
  res: Response,
) {
  try {
    const tickets =
      await getMyTickets(
        req.user!.userId,
      );

    return res.json({
      success: true,
      tickets,
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
| My Events
|--------------------------------------------------------------------------
*/

export async function myEvents(
  req: AuthRequest,
  res: Response,
) {
  try {
    const events =
      await getMyEvents(
        req.user!.userId,
      );

    return res.json({
      success: true,
      events,
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
| Event Hub
|--------------------------------------------------------------------------
*/

export async function getMyEvent(
  req: AuthRequest,
  res: Response,
) {
  try {
    const purchaseId = Array.isArray(
      req.params.purchaseId,
    )
      ? req.params.purchaseId[0]
      : req.params.purchaseId;

    if (!purchaseId) {
      return res.status(400).json({
        success: false,
        message: "Purchase ID is required.",
      });
    }

    const event =
      await getMyEventService(
        req.user!.userId,
        purchaseId,
      );

    return res.json({
      success: true,
      event,
    });

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }
}