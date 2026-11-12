
import { Router } from "express";

import { auth } from "../auth/auth.middleware";
import { NetworkingController } from "./networking.controller";

const router = Router();
const controller = new NetworkingController();

// Matches
router.get(
  "/events/:eventId/networking",
  auth,
  controller.getMatches.bind(controller),
);

// Profile
router.get(
  "/profile",
  auth,
  controller.getProfile.bind(controller),
);

router.patch(
  "/profile",
  auth,
  controller.updateProfile.bind(controller),
);

// Connection requests
router.post(
  "/requests",
  auth,
  controller.sendRequest.bind(controller),
);

router.get(
  "/requests/incoming",
  auth,
  controller.getIncomingRequests.bind(controller),
);

router.get(
  "/requests/outgoing",
  auth,
  controller.getOutgoingRequests.bind(controller),
);

router.post(
  "/requests/:requestId/accept",
  auth,
  controller.acceptRequest.bind(controller),
);

router.post(
  "/requests/:requestId/reject",
  auth,
  controller.rejectRequest.bind(controller),
);

router.post(
  "/requests/:requestId/cancel",
  auth,
  controller.cancelRequest.bind(controller),
);

// Connections
router.get(
  "/connections",
  auth,
  controller.getConnections.bind(controller),
);

router.delete(
  "/connections/:connectionId",
  auth,
  controller.removeConnection.bind(controller),
);

export default router;
