import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import { NetworkingController } from "./networking.controller";

const router = Router();

const controller =
  new NetworkingController();

router.get(
  "/events/:eventId/networking",
  auth,
  controller.getMatches.bind(
    controller,
  ),
);

export default router;