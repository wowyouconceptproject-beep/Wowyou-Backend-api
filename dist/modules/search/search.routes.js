"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_controller_1 = require("./search.controller");
const router = (0, express_1.Router)();
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
router.get("/", search_controller_1.search);
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
router.get("/events", search_controller_1.eventSearch);
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
router.get("/suggestions", search_controller_1.suggestions);
exports.default = router;
