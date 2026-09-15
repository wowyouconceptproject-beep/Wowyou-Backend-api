import {
  Router,
} from "express";

import {
  getHeatmap,
  getPulse,
} from "./intelligence.controller";

const router =
  Router();

/*
|--------------------------------------------------------------------------
| Sentient Pulse
|--------------------------------------------------------------------------
*/

router.get(
  "/events/:eventId/intelligence/pulse",
  getPulse,
);

/*
|--------------------------------------------------------------------------
| Heatmap
|--------------------------------------------------------------------------
*/

router.get(
  "/events/:eventId/intelligence/heatmap",
  getHeatmap,
);

export default router;