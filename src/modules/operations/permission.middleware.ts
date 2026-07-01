import {
  Response,
  NextFunction,
} from "express";

import { OpsRequest } from "./ops.middleware";

import { Permission } from "./operations.permissions";

export function requirePermission(
  permission: Permission
) {
  return (
    req: OpsRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.staff) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const permissions =
      req.staff.permissions || [];

    if (
      !permissions.includes(
        permission
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Permission denied.",
      });
    }

    next();
  };
}