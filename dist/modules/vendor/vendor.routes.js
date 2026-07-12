"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendor_controller_1 = require("./vendor.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Vendor
|--------------------------------------------------------------------------
*/
/*
POST /vendors/apply
*/
router.post("/apply", vendor_controller_1.create);
/*
GET /vendors/applications
*/
router.get("/applications", vendor_controller_1.myApplications);
/*
|--------------------------------------------------------------------------
| Organizer
|--------------------------------------------------------------------------
*/
/*
GET /vendors/events/:eventId
*/
router.get("/events/:eventId", vendor_controller_1.eventApplications);
/*
PATCH /vendors/:id/approve
*/
router.patch("/:id/approve", vendor_controller_1.approve);
/*
PATCH /vendors/:id/reject
*/
router.patch("/:id/reject", vendor_controller_1.reject);
/*
DELETE /vendors/:id
*/
router.delete("/:id", vendor_controller_1.withdraw);
exports.default = router;
