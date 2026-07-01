"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.staff) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }
        const permissions = req.staff.permissions || [];
        if (!permissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied.",
            });
        }
        next();
    };
}
