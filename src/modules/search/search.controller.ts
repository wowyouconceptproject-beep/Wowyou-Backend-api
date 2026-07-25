import {
  Request,
  Response,
} from "express";

import {
  globalSearch,
  searchEvents,
  searchSuggestions,
} from "./search.service";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getQuery(
  req: Request,
) {
  return String(
    req.query.q ?? "",
  ).trim();
}

function getLimit(
  req: Request,
  fallback: number,
  maximum: number,
) {
  const value =
    Number(req.query.limit);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return Math.min(
    Math.floor(value),
    maximum,
  );
}

/*
|--------------------------------------------------------------------------
| Global Search
|--------------------------------------------------------------------------
|
| GET /search?q=lagos
|
| Searches:
| - Events
| - Organizations
|
|--------------------------------------------------------------------------
*/

export async function search(
  req: Request,
  res: Response,
) {
  try {
    const q =
      getQuery(req);

    if (!q) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Search query is required.",
          events: [],
          organizations: [],
        });
    }

    const limit =
      getLimit(
        req,
        20,
        50,
      );

    const results =
      await globalSearch(
        q,
        limit,
      );

    return res.json({
      success: true,

      query: q,

      events:
        results.events ?? [],

      organizations:
        results.organizations ??
        [],
    });
  } catch (error: any) {
    console.error(
      "GLOBAL SEARCH ERROR:",
      error,
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          error?.message ??
          "Unable to search.",
        events: [],
        organizations: [],
      });
  }
}

/*
|--------------------------------------------------------------------------
| Event Search
|--------------------------------------------------------------------------
|
| GET /search/events?q=conference
|
|--------------------------------------------------------------------------
*/

export async function eventSearch(
  req: Request,
  res: Response,
) {
  try {
    const q =
      getQuery(req);

    if (!q) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Search query is required.",
          events: [],
        });
    }

    const limit =
      getLimit(
        req,
        20,
        50,
      );

    const events =
      await searchEvents(
        q,
        limit,
      );

    return res.json({
      success: true,

      query: q,

      count:
        events.length,

      events,
    });
  } catch (error: any) {
    console.error(
      "EVENT SEARCH ERROR:",
      error,
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          error?.message ??
          "Unable to search events.",
        events: [],
      });
  }
}

/*
|--------------------------------------------------------------------------
| Search Suggestions
|--------------------------------------------------------------------------
|
| GET /search/suggestions?q=lag
|
| Used for:
| - Search autocomplete
| - Event suggestions
| - Organization suggestions
|
|--------------------------------------------------------------------------
*/

export async function suggestions(
  req: Request,
  res: Response,
) {
  try {
    const q =
      getQuery(req);

    /*
    |--------------------------------------------------------------------------
    | Empty Query
    |--------------------------------------------------------------------------
    |
    | Suggestions are used while typing.
    | An empty query should therefore return
    | an empty result instead of an error.
    |
    */

    if (!q) {
      return res.json({
        success: true,
        query: "",
        suggestions: [],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent unnecessary database searches
    |--------------------------------------------------------------------------
    */

    if (q.length < 2) {
      return res.json({
        success: true,
        query: q,
        suggestions: [],
      });
    }

    const data =
      await searchSuggestions(
        q,
      );

    return res.json({
      success: true,

      query: q,

      suggestions:
        data.suggestions ?? [],
    });
  } catch (error: any) {
    console.error(
      "SEARCH SUGGESTIONS ERROR:",
      error,
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          error?.message ??
          "Unable to load search suggestions.",
        suggestions: [],
      });
  }
}