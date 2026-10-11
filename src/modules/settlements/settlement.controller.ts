import { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { AuthRequest } from "../auth/auth.middleware";

import {
  getOrganizationSettlementSummary,
  processEligibleSettlements,
} from "./settlement.service";

function validJobSecret(
  received: string | undefined,
  expected: string | undefined,
): boolean {
  if (!received || !expected) {
    return false;
  }

  const a = Buffer.from(received);
  const b = Buffer.from(expected);

  return (
    a.length === b.length &&
    timingSafeEqual(a, b)
  );
}

export async function runSettlementJob(
  req: Request,
  res: Response,
) {
  const expected =
    process.env.SETTLEMENT_JOB_SECRET?.trim();

  const header = req.header("authorization") ?? "";

  const received = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : "";

  if (!validJobSecret(received, expected)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized settlement job request.",
    });
  }

  try {
    const result = await processEligibleSettlements();

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Settlement job failed:", error);

    return res.status(500).json({
      success: false,
      message: "Settlement job failed.",
    });
  }
}

export async function organizationSettlementSummary(
  req: AuthRequest,
  res: Response,
) {
  const ownerId = req.user?.userId;

  if (!ownerId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  const organizationId = String(
    req.params.organizationId ?? "",
  ).trim();

  if (!organizationId) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required.",
    });
  }

  try {
    const summary =
      await getOrganizationSettlementSummary(
        organizationId,
        ownerId,
      );

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    return res.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error(
      "Organizer settlement summary error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load settlement summary.",
    });
  }
}