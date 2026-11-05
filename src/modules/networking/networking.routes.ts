
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
  "/networking/profile",
  auth,
  controller.getProfile.bind(controller),
);

router.patch(
  "/networking/profile",
  auth,
  controller.updateProfile.bind(controller),
);

// Connection requests
router.post(
  "/networking/requests",
  auth,
  controller.sendRequest.bind(controller),
);

router.get(
  "/networking/requests/incoming",
  auth,
  controller.getIncomingRequests.bind(controller),
);

router.get(
  "/networking/requests/outgoing",
  auth,
  controller.getOutgoingRequests.bind(controller),
);

router.post(
  "/networking/requests/:requestId/accept",
  auth,
  controller.acceptRequest.bind(controller),
);

router.post(
  "/networking/requests/:requestId/reject",
  auth,
  controller.rejectRequest.bind(controller),
);

router.post(
  "/networking/requests/:requestId/cancel",
  auth,
  controller.cancelRequest.bind(controller),
);

// Connections
router.get(
  "/networking/connections",
  auth,
  controller.getConnections.bind(controller),
);

router.delete(
  "/networking/connections/:connectionId",
  auth,
  controller.removeConnection.bind(controller),
);

export default router;
