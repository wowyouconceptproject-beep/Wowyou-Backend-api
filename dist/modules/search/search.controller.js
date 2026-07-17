"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = search;
exports.eventSearch = eventSearch;
exports.suggestions = suggestions;
const search_service_1 = require("./search.service");
async function search(req, res) {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
        return res.status(400).json({
            success: false,
            message: "Search query is required.",
        });
    }
    const results = await (0, search_service_1.globalSearch)(q);
    res.json(results);
}
async function eventSearch(req, res) {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
        return res.status(400).json({
            success: false,
            message: "Search query is required.",
        });
    }
    const events = await (0, search_service_1.searchEvents)(q);
    res.json({
        success: true,
        events,
    });
}
async function suggestions(req, res) {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
        return res.json({
            success: true,
            suggestions: [],
        });
    }
    const data = await (0, search_service_1.searchSuggestions)(q);
    res.json(data);
}
