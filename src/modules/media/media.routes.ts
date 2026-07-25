import {
  Router,
} from "express";

import {
  auth,
} from "../auth/auth.middleware";

import {
  uploadEventCover,
} from "./media.controller";

import {
  uploadEventCover as eventCoverMiddleware,
} from "./media.middleware";

const router =
  Router();

router.post(
  "/event-cover",
  auth,
  eventCoverMiddleware.single(
    "image"
  ),
  uploadEventCover
);

export default router;