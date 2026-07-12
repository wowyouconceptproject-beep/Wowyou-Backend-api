import { Request, Response } from "express";

import {
  getDiscoveryFeed,
} from "./discovery.service";

export async function discovery(
  req: Request,
  res: Response,
) {
  try {
    const result =
      await getDiscoveryFeed();

    return res.json({
      success: true,

      ...result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,

      message:
        error.message,
    });
  }
}