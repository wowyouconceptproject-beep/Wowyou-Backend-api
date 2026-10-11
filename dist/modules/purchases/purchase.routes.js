"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../auth/auth.middleware");
const purchase_controller_1 = require("./purchase.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Purchase Quote
|--------------------------------------------------------------------------
|
| POST /quote
|
| Returns the server-calculated:
| - Ticket subtotal
| - Transaction fee
| - Total payable
|
| Requires authentication.
| Does not create a purchase or reserve inventory.
|
*/
router.post("/quote", auth_middleware_1.auth, purchase_controller_1.quote);
/*
|--------------------------------------------------------------------------
| Purchase Ticket
|--------------------------------------------------------------------------
*/
router.post("/create", auth_middleware_1.auth, purchase_controller_1.create);
/*
|--------------------------------------------------------------------------
| Payment Status
|--------------------------------------------------------------------------
*/
router.get("/:purchaseId/status", auth_middleware_1.auth, purchase_controller_1.paymentStatus);
/*
|--------------------------------------------------------------------------
| Legacy
|--------------------------------------------------------------------------
|
| Existing endpoint used by the current web and mobile implementation.
| Leave the endpoint unchanged.
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
/*
|--------------------------------------------------------------------------
| Organizer Manual / Offline Ticket Sale
|--------------------------------------------------------------------------
*/
router.post("/manual-sale", auth_middleware_1.auth, purchase_controller_1.manualSale);
exports.default = router;
