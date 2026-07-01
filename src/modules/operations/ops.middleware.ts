import {
  Request,
  Response,
  NextFunction,
} from "express";

import { prisma } from "../../lib/prisma";

import {
  verifyOpsToken,
} from "./ops.jwt";

export interface OpsRequest
  extends Request {
  staff?: {
    id: string;
    eventId: string;
    role: string;
    station?: string | null;
    permissions: string[];
  };

  token?: string;

  sessionId?: string;
}

export async function opsAuth(
  req: OpsRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const auth =
      req.headers.authorization;

    if (
      !auth ||
      !auth.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized.",
      });
    }

    const token =
      auth.replace(
        "Bearer ",
        ""
      );

    req.token = token;

    const payload =
      verifyOpsToken(
        token
      ) as {
        staffId: string;
        eventId: string;
        role: string;
        station?: string;
        permissions: string[];
      };

    const session =
      await prisma.operationSession.findUnique({
        where: {
          token,
        },

        include: {
          staff: {
            include: {
              event: true,
            },
          },
        },
      });

    if (!session) {
      return res.status(401).json({
        success: false,
        message:
          "Session not found.",
      });
    }

    if (!session.isActive) {
      return res.status(401).json({
        success: false,
        message:
          "Session has expired.",
      });
    }

    if (!session.staff.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Staff account disabled.",
      });
    }

    if (session.staff.isRevoked) {
      return res.status(403).json({
        success: false,
        message:
          "Access revoked.",
      });
    }

    if (
      session.staff.event.status !==
      "PUBLISHED"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Event unavailable.",
      });
    }

    req.staff = {
      id: session.staff.id,

      eventId:
        session.staff.eventId,

      role:
        session.staff.role,

      station:
        session.staff.station,

      permissions:
        session.staff.permissions,
    };

    req.sessionId =
      session.id;

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message:
        "Invalid token.",
    });

  }
}