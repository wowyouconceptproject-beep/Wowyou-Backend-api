"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHomepageScore = calculateHomepageScore;
function calculateHomepageScore(event) {
    const recencyBonus = Math.max(0, 30 - event.startsInDays) * 5;
    return (event.views * 0.25 +
        event.wishlistCount * 0.20 +
        event.shareCount * 0.10 +
        event.soldTickets * 0.45 +
        recencyBonus);
}
