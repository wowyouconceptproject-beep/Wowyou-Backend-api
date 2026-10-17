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
    if (score >= 85)
        return "CRITICAL";
    if (score >= 65)
        return "HIGH";
    if (score >= 40)
        return "MODERATE";
    return "LOW";
}
function getState(score, occupancyPercentage, arrivalsLast15Minutes) {
    if (occupancyPercentage >= 95 || score >= 90) {
        return "CRITICAL";
    }
    if (occupancyPercentage >= 85 || score >= 75) {
        return "CONGESTED";
    }
    if (arrivalsLast15Minutes >= 30 || score >= 60) {
        return "SURGING";
    }
    if (score >= 35) {
        return "ACTIVE";
    }
    return "CALM";
}
function readObservationPayload(payload) {
    if (!payload ||
        typeof payload !== "object" ||
        Array.isArray(payload)) {
        return null;
    }
    return payload;
}
/*
|--------------------------------------------------------------------------
| Event Pulse
|--------------------------------------------------------------------------
*/
async function getEventPulse(eventId) {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60_000);
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60_000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60_000);
    /*
    |--------------------------------------------------------------------------
    | Load operational metrics and recent observations
    |--------------------------------------------------------------------------
    */
    const [event, arrivalsLast5Minutes, arrivalsLast15Minutes, activityLast15Minutes, onlineStaff, recentObservations,] = await Promise.all([
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
        prisma_1.prisma.eventActivity.count({
            where: {
                eventId,
                createdAt: {
                    gte: fifteenMinutesAgo,
                },
            },
        }),
        prisma_1.prisma.operationSession.count({
            where: {
                isActive: true,
                staff: {
                    eventId,
                },
            },
        }),
        prisma_1.prisma.eventActivity.findMany({
            where: {
                eventId,
                type: "FIELD_OBSERVATION",
                createdAt: {
                    gte: thirtyMinutesAgo,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 100,
            select: {
                id: true,
                station: true,
                title: true,
                description: true,
                payload: true,
                createdAt: true,
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
        ? clamp((currentOccupancy / capacity) * 100)
        : 0;
    /*
    |--------------------------------------------------------------------------
    | Movement
    |--------------------------------------------------------------------------
    */
    const arrivalsPerMinute = arrivalsLast15Minutes / 15;
    /*
    |--------------------------------------------------------------------------
    | Base operational pressure
    |--------------------------------------------------------------------------
    */
    const capacityPressure = occupancyPercentage;
    const arrivalPressure = clamp(arrivalsPerMinute * 5);
    const activityPressure = clamp(activityLast15Minutes * 3);
    const staffingPressure = onlineStaff === 0
        ? 20
        : onlineStaff < 2
            ? 10
            : 0;
    const score = Math.round(clamp(capacityPressure * 0.55 +
        arrivalPressure * 0.25 +
        activityPressure * 0.15 +
        staffingPressure * 0.05));
    const pulseState = getState(score, occupancyPercentage, arrivalsLast15Minutes);
    /*
    |--------------------------------------------------------------------------
    | Signals and recommendations
    |--------------------------------------------------------------------------
    */
    const signals = [];
    const recommendations = [];
    /*
    |--------------------------------------------------------------------------
    | Staff-reported observations
    |--------------------------------------------------------------------------
    |
    | These reports describe conditions observed by staff.
    | They are not automatically verified emergency detections.
    |
    */
    let hasEmergencyReport = false;
    let hasIncidentReport = false;
    let hasCriticalCrowdReport = false;
    let hasHighCrowdReport = false;
    const reportedSentiments = {};
    for (const observation of recentObservations) {
        const data = readObservationPayload(observation.payload);
        if (!data) {
            continue;
        }
        const zone = typeof data.zone === "string" &&
            data.zone.trim().length > 0
            ? data.zone.trim()
            : observation.station ?? "Unknown zone";
        const crowdLevel = data.crowdLevel;
        const safetyStatus = data.safetyStatus;
        const sentiment = data.sentiment;
        /*
        |--------------------------------------------------------------------------
        | Safety reports
        |--------------------------------------------------------------------------
        */
        if (safetyStatus === "EMERGENCY") {
            hasEmergencyReport = true;
            signals.push({
                type: "FIELD_SAFETY_REPORT",
                severity: "CRITICAL",
                title: `Emergency reported: ${zone}`,
                message: `Field staff reported emergency conditions ` +
                    `in ${zone}. Reported at ${observation.createdAt.toISOString()}.`,
            });
            recommendations.push({
                priority: "CRITICAL",
                title: `Review emergency report: ${zone}`,
                action: `Immediately assess the reported emergency in ${zone} ` +
                    `and activate the event's emergency procedures as appropriate.`,
            });
        }
        else if (safetyStatus === "INCIDENT") {
            hasIncidentReport = true;
            signals.push({
                type: "FIELD_SAFETY_REPORT",
                severity: "HIGH",
                title: `Safety incident reported: ${zone}`,
                message: `Field staff reported a safety incident in ${zone}. ` +
                    `Reported at ${observation.createdAt.toISOString()}.`,
            });
            recommendations.push({
                priority: "HIGH",
                title: `Investigate safety incident: ${zone}`,
                action: `Investigate the reported incident in ${zone} ` +
                    `and take appropriate safety measures.`,
            });
        }
        else if (safetyStatus === "CAUTION") {
            signals.push({
                type: "FIELD_SAFETY_CAUTION",
                severity: "MODERATE",
                title: `Safety caution: ${zone}`,
                message: `Field staff reported caution conditions in ${zone}.`,
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Crowd reports
        |--------------------------------------------------------------------------
        */
        if (crowdLevel === "CRITICAL") {
            hasCriticalCrowdReport = true;
            signals.push({
                type: "FIELD_CROWD_REPORT",
                severity: "CRITICAL",
                title: `Critical crowd pressure: ${zone}`,
                message: `Field staff reported critical crowd density in ${zone}.`,
            });
            recommendations.push({
                priority: "CRITICAL",
                title: `Assess critical crowd conditions: ${zone}`,
                action: `Immediately assess crowd conditions in ${zone} ` +
                    `and apply the appropriate crowd-management procedures.`,
            });
        }
        else if (crowdLevel === "HIGH") {
            hasHighCrowdReport = true;
            signals.push({
                type: "FIELD_CROWD_REPORT",
                severity: "HIGH",
                title: `High crowd density: ${zone}`,
                message: `Field staff reported high crowd density in ${zone}.`,
            });
            recommendations.push({
                priority: "HIGH",
                title: `Review crowd flow: ${zone}`,
                action: `Assess crowd flow in ${zone} and consider adjusting ` +
                    `staffing, queues, or entry flow.`,
            });
        }
        else if (crowdLevel === "MODERATE") {
            signals.push({
                type: "FIELD_CROWD_REPORT",
                severity: "MODERATE",
                title: `Moderate crowd density: ${zone}`,
                message: `Field staff reported moderate crowd density in ${zone}.`,
            });
        }
        /*
        |--------------------------------------------------------------------------
        | Sentiment reports
        |--------------------------------------------------------------------------
        */
        if (typeof sentiment === "string") {
            reportedSentiments[sentiment] =
                (reportedSentiments[sentiment] ?? 0) + 1;
        }
        if (sentiment === "VERY_NEGATIVE" ||
            sentiment === "NEGATIVE") {
            const veryNegative = sentiment === "VERY_NEGATIVE";
            signals.push({
                type: "FIELD_SENTIMENT_REPORT",
                severity: veryNegative ? "HIGH" : "MODERATE",
                title: `Negative attendee sentiment: ${zone}`,
                message: `Field staff reported ${sentiment.toLowerCase()} ` +
                    `attendee sentiment in ${zone}.`,
            });
            recommendations.push({
                priority: veryNegative ? "HIGH" : "MODERATE",
                title: `Review attendee experience: ${zone}`,
                action: `Investigate the reported negative attendee sentiment in ${zone} ` +
                    `and identify any operational issues affecting the experience.`,
            });
        }
    }
    /*
    |--------------------------------------------------------------------------
    | Capacity signal
    |--------------------------------------------------------------------------
    */
    if (occupancyPercentage >= 85) {
        signals.push({
            type: "CAPACITY_PRESSURE",
            severity: occupancyPercentage >= 95
                ? "CRITICAL"
                : "HIGH",
            title: "Capacity pressure",
            message: `Occupancy is at ${occupancyPercentage.toFixed(0)}% ` +
                "of configured capacity.",
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Arrival surge
    |--------------------------------------------------------------------------
    */
    if (arrivalsLast15Minutes >= 30) {
        signals.push({
            type: "ARRIVAL_SURGE",
            severity: arrivalsLast15Minutes >= 60
                ? "CRITICAL"
                : "HIGH",
            title: "Arrival surge",
            message: `${arrivalsLast15Minutes} attendees have checked in ` +
                "during the last 15 minutes.",
        });
        recommendations.push({
            priority: arrivalsLast15Minutes >= 60
                ? "CRITICAL"
                : "HIGH",
            title: "Watch entry operations",
            action: "Review registration and entrance staffing for emerging congestion.",
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Staffing pressure
    |--------------------------------------------------------------------------
    */
    if (onlineStaff <= 1 &&
        occupancyPercentage >= 60) {
        signals.push({
            type: "STAFFING_PRESSURE",
            severity: "HIGH",
            title: "Low operational staffing",
            message: `${onlineStaff} operational staff session` +
                `${onlineStaff === 1 ? "" : "s"} currently active.`,
        });
        recommendations.push({
            priority: "HIGH",
            title: "Review field coverage",
            action: "Consider bringing another operational staff member online.",
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Critical capacity recommendation
    |--------------------------------------------------------------------------
    */
    if (occupancyPercentage >= 95) {
        recommendations.push({
            priority: "CRITICAL",
            title: "Capacity intervention",
            action: "Immediately review entry flow and venue capacity controls.",
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Overall summary
    |--------------------------------------------------------------------------
    */
    let summary = "Event operations are currently stable.";
    if (pulseState === "SURGING") {
        summary =
            "Arrival activity is accelerating and the event is entering a higher-pressure operating state.";
    }
    if (pulseState === "CONGESTED") {
        summary =
            "The event is operating under significant capacity pressure.";
    }
    if (pulseState === "CRITICAL") {
        summary =
            "The event is approaching or exceeding a critical operational threshold.";
    }
    if (pulseState === "ACTIVE") {
        summary =
            "The event is active with measurable attendee movement.";
    }
    /*
    |--------------------------------------------------------------------------
    | Observation-aware summary
    |--------------------------------------------------------------------------
    */
    if (hasEmergencyReport) {
        summary =
            "A field-reported emergency requires immediate assessment by event operations.";
    }
    else if (hasCriticalCrowdReport) {
        summary =
            "Field staff have reported critical crowd conditions requiring immediate assessment.";
    }
    else if (hasIncidentReport) {
        summary =
            "A field-reported safety incident requires investigation by event operations.";
    }
    else if (hasHighCrowdReport) {
        summary =
            "Field staff have reported high crowd density in at least one zone.";
    }
    /*
    |--------------------------------------------------------------------------
    | Fallback signal
    |--------------------------------------------------------------------------
    */
    if (signals.length === 0) {
        signals.push({
            type: "NORMAL_OPERATIONS",
            severity: "LOW",
            title: "Operations stable",
            message: "No elevated operational pressure is currently detected.",
        });
    }
    /*
    |--------------------------------------------------------------------------
    | Movement direction
    |--------------------------------------------------------------------------
    */
    let direction;
    if (arrivalsPerMinute >= 2) {
        direction = "INCREASING";
    }
    else if (arrivalsPerMinute <= 0.5) {
        direction = "DECREASING";
    }
    else {
        direction = "STABLE";
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
            remaining: Math.max(capacity - currentOccupancy, 0),
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
