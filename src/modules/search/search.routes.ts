import {
  Router,
} from "express";

import {
  search,
  eventSearch,
  suggestions,
} from "./search.controller";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| Search Routes
|--------------------------------------------------------------------------
|
| All search routes are public.
|
| Base route:
| /search
|
*/

/*
|--------------------------------------------------------------------------
| Global Search
|--------------------------------------------------------------------------
|
| GET /search?q=lagos
| GET /search?q=lagos&limit=20
|
| Searches:
| - Events
| - Organizations
|
*/

router.get(
  "/",
  search,
);

/*
|--------------------------------------------------------------------------
| Event Search
|--------------------------------------------------------------------------
|
| GET /search/events?q=conference
| GET /search/events?q=conference&limit=20
|
| Searches published events only.
|
*/

router.get(
  "/events",
  eventSearch,
);

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
*/

router.get(
  "/suggestions",
  suggestions,
);

export default router;