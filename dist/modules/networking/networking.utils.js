"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = normalize;
exports.unique = unique;
exports.overlap = overlap;
exports.overlapPercentage = overlapPercentage;
exports.clamp = clamp;
function normalize(values) {
    return values
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
}
function unique(values) {
    return [...new Set(normalize(values))];
}
function overlap(a, b) {
    const left = new Set(unique(a));
    const right = new Set(unique(b));
    let count = 0;
    for (const item of left) {
        if (right.has(item)) {
            count++;
        }
    }
    return count;
}
function overlapPercentage(a, b) {
    const total = Math.max(unique(a).length, unique(b).length);
    if (total === 0) {
        return 0;
    }
    return overlap(a, b) / total;
}
function clamp(value, min = 0, max = 100) {
    return Math.min(Math.max(value, min), max);
}
