import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes";

import testRoutes from "./test.routes";

import organizationRoutes
  from "../modules/organizations/organization.routes";


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


export default router;