"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventPulse = getEventPulse;
const prisma_1 = require("../../lib/prisma");
/*
|--------------------------------------------------------------------------
| Utilities
|--------------------------------------------------------------------------
*/
function clamp(value, min = 0, max = 100) {
    return Math.min(Math.max(value, min), max);
}
function getLevel(score) {
    if (score >= 85) {
        return "CRITICAL";
    }
    if (score >= 65) {
        return "HIGH";
    }
    if (score >= 40) {
        return "MODERATE";
    }
    return "LOW";
}
function getState(score, occupancyPercentage, arrivalsLast15Minutes) {
    /*
     * Capacity always wins when the event is
     * close to its hard capacity.
     */
    if (occupancyPercentage >= 95 ||
        score >= 90) {
        return "CRITICAL";
    }
    if (occupancyPercentage >= 85 ||
        score >= 75) {
        return "CONGESTED";
    }
    if (arrivalsLast15Minutes >= 30 ||
        score >= 60) {
        return "SURGING";
    }
    if (score >= 35) {
        return "ACTIVE";
    }
    return "CALM";
}
/*
|--------------------------------------------------------------------------
| Event Pulse
|--------------------------------------------------------------------------
*/
async function getEventPulse(eventId) {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() -
        5 * 60_000);
    const fifteenMinutesAgo = new Date(now.getTime() -
        15 * 60_000);
    /*
     * Pull all signals concurrently.
     */
    const [event, arrivalsLast5Minutes, arrivalsLast15Minutes, activityLast15Minutes, onlineStaff,] = await Promise.all([
        /*
         * Event capacity state
         */
        prisma_1.prisma.event.findUnique({
            where: {
                id: eventId,
            },
            select: {
                id: true,
                capacity: true,
                currentOccupancy: true,
                totalCheckIns: true,
                totalCheckOuts: true,
            },
        }),
        /*
         * Recent check-ins.
         */
        prisma_1.prisma.ticketCheckIn.count({
            where: {
                purchase: {
                    eventId,
                },
                checkedInAt: {
                    gte: fiveMinutesAgo,
                },
            },
        }),
        /*
         * Recent check-ins over 15 minutes.
         */
        prisma_1.prisma.ticketCheckIn.count({
            where: {
                purchase: {
                    eventId,
                },
                checkedInAt: {
                    gte: fifteenMinutesAgo,
                },
            },
        }),
        /*
         * Operational activity.
         */
        prisma_1.prisma.eventActivity.count({
            where: {
                eventId,
                createdAt: {
                    gte: fifteenMinutesAgo,
                },
            },
        }),
        /*
         * Currently active field staff.
         */
        prisma_1.prisma.operationSession.count({
            where: {
                isActive: true,
                staff: {
                    eventId,
                },
            },
        }),
    ]);
    if (!event) {
        throw new Error("Event not found.");
    }
    /*
    |--------------------------------------------------------------------------
    | Capacity
    |--------------------------------------------------------------------------
    */
    const capacity = Math.max(event.capacity, 0);
    const currentOccupancy = Math.max(event.currentOccupancy, 0);
    const occupancyPercentage = capacity > 0
        ? clamp((currentOccupancy /
            capacity) *
            100)
        : 0;
    /*
    |--------------------------------------------------------------------------
    | Movement
    |--------------------------------------------------------------------------
    */
    const arrivalsPerMinute = arrivalsLast15Minutes /
        15;
    /*
    |--------------------------------------------------------------------------
    | Intelligence Signals
    |--------------------------------------------------------------------------
    */
    const capacityPressure = occupancyPercentage;
    /*
     * Convert arrival velocity into a
     * pressure score.
     *
     * 20 arrivals/minute ≈ 100 pressure.
     */
    const arrivalPressure = clamp(arrivalsPerMinute *
        5);
    /*
     * Operational activity contributes
     * to the event pulse.
     */
    const activityPressure = clamp(activityLast15Minutes *
        3);
    /*
     * Staffing pressure.
     */
    const staffingPressure = onlineStaff === 0
        ? 20
        : onlineStaff < 2
            ? 10
            : 0;
    /*
    |--------------------------------------------------------------------------
    | Pulse Score
    |--------------------------------------------------------------------------
    */
    const score = Math.round(clamp(capacityPressure *
        0.55 +
        arrivalPressure *
            0.25 +
        activityPressure *
            0.15 +
        staffingPressure *
            0.05));
    const pulseState = getState(score, occupancyPercentage, arrivalsLast15Minutes);
    /*
    |--------------------------------------------------------------------------
    | Signals
    |--------------------------------------------------------------------------
    */
    const signals = [];
    const recommendations = [];
    /*
     * Capacity signal.
     */
    if (occupancyPercentage >=
        85) {
        signals.push({
            type: "CAPACITY_PRESSURE",
            severity: occupancyPercentage >=
                95
                ? "CRITICAL"
                : "HIGH",
            title: "Capacity pressure",
            message: `Occupancy is at ${occupancyPercentage.toFixed(0)}% of configured capacity.`,
        });
    }
    /*
     * Arrival surge.
     */
    if (arrivalsLast15Minutes >=
        30) {
        signals.push({
            type: "ARRIVAL_SURGE",
            severity: arrivalsLast15Minutes >=
                60
                ? "CRITICAL"
                : "HIGH",
            title: "Arrival surge",
            message: `${arrivalsLast15Minutes} attendees have checked in during the last 15 minutes.`,
        });
        recommendations.push({
            priority: arrivalsLast15Minutes >=
                60
                ? "CRITICAL"
                : "HIGH",
            title: "Watch entry operations",
            action: "Review registration and entrance staffing for emerging congestion.",
        });
    }
    /*
     * Staffing.
     */
    if (onlineStaff <= 1 &&
        occupancyPercentage >=
            60) {
        signals.push({
            type: "STAFFING_PRESSURE",
            severity: "HIGH",
            title: "Low operational staffing",
            message: `${onlineStaff} operational staff session${onlineStaff === 1
                ? ""
                : "s"} currently active.`,
        });
        recommendations.push({
            priority: "HIGH",
            title: "Review field coverage",
            action: "Consider bringing another operational staff member online.",
        });
    }
    /*
     * Critical capacity.
     */
    if (occupancyPercentage >=
        95) {
        recommendations.push({
            priority: "CRITICAL",
            title: "Capacity intervention",
            action: "Immediately review entry flow and venue capacity controls.",
        });
    }
    /*
     * Nothing abnormal.
     */
    if (signals.length ===
        0) {
        signals.push({
            type: "NORMAL_OPERATIONS",
            severity: "LOW",
            title: "Operations stable",
            message: "No elevated operational pressure is currently detected.",
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Movement Direction
    |--------------------------------------------------------------------------
    */
    let direction;
    if (arrivalsPerMinute >=
        2) {
        direction =
            "INCREASING";
    }
    else if (arrivalsPerMinute <=
        0.5) {
        direction =
            "DECREASING";
    }
    else {
        direction =
            "STABLE";
    }
    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */
    let summary = "Event operations are currently stable.";
    if (pulseState ===
        "SURGING") {
        summary =
            "Arrival activity is accelerating and the event is entering a higher-pressure operating state.";
    }
    if (pulseState ===
        "CONGESTED") {
        summary =
            "The event is operating under significant capacity pressure.";
    }
    if (pulseState ===
        "CRITICAL") {
        summary =
            "The event is approaching or exceeding a critical operational threshold.";
    }
    if (pulseState ===
        "ACTIVE") {
        summary =
            "The event is active with measurable attendee movement.";
    }
    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */
    return {
        eventId,
        state: pulseState,
        score,
        confidence: 92,
        summary,
        generatedAt: now.toISOString(),
        capacity: {
            currentOccupancy,
            capacity,
            occupancyPercentage,
            remaining: Math.max(capacity -
                currentOccupancy, 0),
        },
        movement: {
            arrivalsLast5Minutes,
            arrivalsLast15Minutes,
            arrivalsPerMinute: Number(arrivalsPerMinute.toFixed(2)),
            totalCheckIns: event.totalCheckIns,
            totalCheckOuts: event.totalCheckOuts,
            netMovement: event.totalCheckIns -
                event.totalCheckOuts,
            direction,
        },
        operations: {
            onlineStaff,
            activityLast15Minutes,
        },
        signals,
        recommendations,
    };
}
