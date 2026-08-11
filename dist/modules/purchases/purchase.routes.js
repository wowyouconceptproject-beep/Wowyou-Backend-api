"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const purchase_controller_1 = require("./purchase.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Purchase Ticket
|--------------------------------------------------------------------------
*/
router.post("/create", auth_middleware_1.auth, purchase_controller_1.create);
router.get("/:purchaseId/status", auth_middleware_1.auth, purchase_controller_1.paymentStatus);
/*
|--------------------------------------------------------------------------
| Legacy
|--------------------------------------------------------------------------
|
| Existing endpoint used by the current
| web and mobile implementation.
| Leave untouched.
|
*/
router.get("/my", auth_middleware_1.auth, purchase_controller_1.myTickets);
/*
|--------------------------------------------------------------------------
| My Events (Attendee App)
|--------------------------------------------------------------------------
*/
router.get("/my-events", auth_middleware_1.auth, purchase_controller_1.myEvents);
/*
|--------------------------------------------------------------------------
| Event Hub
|--------------------------------------------------------------------------
*/
router.get("/my-events/:purchaseId", auth_middleware_1.auth, purchase_controller_1.getMyEvent);
exports.default = router;
