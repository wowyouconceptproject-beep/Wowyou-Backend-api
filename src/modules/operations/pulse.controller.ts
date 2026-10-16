import type { Response } from "express";
import type { Prisma } from "@prisma/client";

import type { OpsRequest } from "./ops.middleware";
import { prisma } from "../../lib/prisma";

const CROWD_LEVELS = [
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
] as const;

const SAFETY_STATUSES = [
  "NORMAL",
  "CAUTION",
  "INCIDENT",
  "EMERGENCY",
] as const;

const SENTIMENT_LEVELS = [
  "VERY_POSITIVE",
  "POSITIVE",
  "NEUTRAL",
  "NEGATIVE",
  "VERY_NEGATIVE",
] as const;

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return (
    typeof value === "string" &&
    allowed.includes(value)
  );
}

export async function submitPulseObservation(
  req: OpsRequest,
  res: Response,
) {
  try {
    const staff = req.staff;

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Operations authentication is required.",
      });
    }

    const {
      zone,
      crowdLevel,
      safetyStatus,
      sentiment,
      note,
    } = req.body ?? {};

    if (
      typeof zone !== "string" ||
      zone.trim().length === 0 ||
      zone.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "A zone between 1 and 100 characters is required.",
      });
    }

    if (!isOneOf(crowdLevel, CROWD_LEVELS)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crowd level.",
      });
    }

    if (!isOneOf(safetyStatus, SAFETY_STATUSES)) {
      return res.status(400).json({
        success: false,
        message: "Invalid safety status.",
      });
    }

    if (!isOneOf(sentiment, SENTIMENT_LEVELS)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sentiment level.",
      });
    }

    if (
      note !== undefined &&
      note !== null &&
      (typeof note !== "string" || note.length > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message: "The observation note must not exceed 1000 characters.",
      });
    }

    const eventId = staff.eventId;
    const station = staff.station ?? zone.trim();

    const payload: Prisma.InputJsonObject = {
      zone: zone.trim(),
      crowdLevel,
      safetyStatus,
      sentiment,
      note: typeof note === "string" ? note.trim() : "",
      reportedAt: new Date().toISOString(),
    };

    const activity = await prisma.eventActivity.create({
      data: {
        eventId,
        actorId: staff.id,
        station,
        type: "FIELD_OBSERVATION",
        title: `Field observation: ${zone.trim()}`,
        description:
          `Crowd: ${crowdLevel}; ` +
          `Safety: ${safetyStatus}; ` +
          `Sentiment: ${sentiment}`,
        payload,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Field observation recorded.",
      observation: {
        id: activity.id,
        eventId: activity.eventId,
        zone: zone.trim(),
        crowdLevel,
        safetyStatus,
        sentiment,
        note: typeof note === "string" ? note.trim() : "",
        station: activity.station,
        createdAt: activity.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to submit pulse observation:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to record the field observation.",
    });
  }
}