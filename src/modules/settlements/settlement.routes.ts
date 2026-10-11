import { Router } from "express";
import { auth } from "../auth/auth.middleware";

import {
  organizationSettlementSummary,
  runSettlementJob,
} from "./settlement.controller";

const router = Router();

// This endpoint uses SETTLEMENT_JOB_SECRET,
// not browser authentication.
router.post(
  "/run",
  runSettlementJob,
);

// Only the authenticated organization owner can view
// the organization's settlement records.
router.get(
  "/organization/:organizationId",
  auth,
  organizationSettlementSummary,
);

export default router;