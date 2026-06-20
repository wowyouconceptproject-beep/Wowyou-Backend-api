import { Router } from "express";

import { prisma } from "../lib/prisma";

const router = Router();

router.get(
  "/db",
  async (_req, res) => {
    const users =
      await prisma.user.count();

    return res.json({
      success: true,
      users,
    });
  }
);

export default router;