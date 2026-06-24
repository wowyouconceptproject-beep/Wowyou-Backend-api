import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes";

import testRoutes from "./test.routes";

import organizationRoutes
  from "../modules/organizations/organization.routes";

import eventRoutes
  from "../modules/events/event.routes";

import attendeeProfileRoutes
from "../modules/attendee-profile/attendee-profile.routes";

import ticketRoutes
from "../modules/tickets/ticket.routes";

import revenueRoutes
from "../modules/revenue/revenue.routes";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    message:
      "WowYou EventTech API",
  });
});


router.use(testRoutes);

router.use(
  "/auth",
  authRoutes
);

router.use(
  "/organizations",
  organizationRoutes
);

router.use(
  "/events",
  eventRoutes
);

router.use(
  "/attendee-profile",
  attendeeProfileRoutes
);

router.use(
  "/tickets",
  ticketRoutes
);

router.use(
  "/revenue",
  revenueRoutes
);

export default router;