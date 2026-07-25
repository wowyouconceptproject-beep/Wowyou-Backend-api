"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
exports.eventSearch = eventSearch;
exports.suggestions = suggestions;
const search_service_1 = require("./search.service");
/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
function getQuery(req) {
    return String(req.query.q ?? "").trim();
}
function getLimit(req, fallback, maximum) {
    const value = Number(req.query.limit);
    if (!Number.isFinite(value) ||
        value <= 0) {
        return fallback;
    }
    return Math.min(Math.floor(value), maximum);
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
async function search(req, res) {
    try {
        const q = getQuery(req);
        if (!q) {
            return res
                .status(400)
                .json({
                success: false,
                message: "Search query is required.",
                events: [],
                organizations: [],
            });
        }
        const limit = getLimit(req, 20, 50);
        const results = await (0, search_service_1.globalSearch)(q, limit);
        return res.json({
            success: true,
            query: q,
            events: results.events ?? [],
            organizations: results.organizations ??
                [],
        });
    }
    catch (error) {
        console.error("GLOBAL SEARCH ERROR:", error);
        return res
            .status(500)
            .json({
            success: false,
            message: error?.message ??
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
async function eventSearch(req, res) {
    try {
        const q = getQuery(req);
        if (!q) {
            return res
                .status(400)
                .json({
                success: false,
                message: "Search query is required.",
                events: [],
            });
        }
        const limit = getLimit(req, 20, 50);
        const events = await (0, search_service_1.searchEvents)(q, limit);
        return res.json({
            success: true,
            query: q,
            count: events.length,
            events,
        });
    }
    catch (error) {
        console.error("EVENT SEARCH ERROR:", error);
        return res
            .status(500)
            .json({
            success: false,
            message: error?.message ??
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
async function suggestions(req, res) {
    try {
        const q = getQuery(req);
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
        const data = await (0, search_service_1.searchSuggestions)(q);
        return res.json({
            success: true,
            query: q,
            suggestions: data.suggestions ?? [],
        });
    }
    catch (error) {
        console.error("SEARCH SUGGESTIONS ERROR:", error);
        return res
            .status(500)
            .json({
            success: false,
            message: error?.message ??
                "Unable to load search suggestions.",
            suggestions: [],
        });
    }
}
