import { Request, Response } from "express";

import {
  globalSearch,
  searchEvents,
  searchSuggestions,
} from "./search.service";

export async function search(
  req: Request,
  res: Response,
) {
  const q =
      String(req.query.q ?? "").trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      message: "Search query is required.",
    });
  }

  const results =
      await globalSearch(q);

  res.json(results);
}

export async function eventSearch(
  req: Request,
  res: Response,
) {
  const q =
      String(req.query.q ?? "").trim();

  if (!q) {
    return res.status(400).json({
      success: false,
      message: "Search query is required.",
    });
  }

  const events =
      await searchEvents(q);

  res.json({
    success: true,
    events,
  });
}

export async function suggestions(
  req: Request,
  res: Response,
) {
  const q =
      String(req.query.q ?? "").trim();

  if (!q) {
    return res.json({
      success: true,
      suggestions: [],
    });
  }

  const data =
      await searchSuggestions(q);

  res.json(data);
}