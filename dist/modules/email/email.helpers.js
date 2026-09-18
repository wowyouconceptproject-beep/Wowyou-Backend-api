"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredEnv = getRequiredEnv;
exports.escapeHtml = escapeHtml;
exports.formatMoney = formatMoney;
exports.formatDate = formatDate;
exports.formatTime = formatTime;
exports.formatDateTime = formatDateTime;
function getRequiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is not configured.`);
    }
    return value;
}
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function formatMoney(amount, currency) {
    try {
        return new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: currency.toUpperCase(),
        }).format(amount);
    }
    catch {
        return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
}
function formatDate(date) {
    return new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(date));
}
function formatTime(date) {
    return new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(date));
}
function formatDateTime(date) {
    return `${formatDate(date)} at ${formatTime(date)}`;
}
