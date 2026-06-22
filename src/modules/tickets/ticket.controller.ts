import { Request, Response } from "express";

import {
  createTicket,
  getTickets,
} from "./ticket.service";

export async function create(
  req: Request,
  res: Response
) {
  try {
    const ticket =
      await createTicket(
        req.params.eventId as string,
        req.body
      );

    return res.status(201).json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function list(
  req: Request,
  res: Response
) {
  try {
    const tickets =
      await getTickets(
        req.params.eventId as string
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