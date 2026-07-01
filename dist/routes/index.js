"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const test_routes_1 = __importDefault(require("./test.routes"));
const organization_routes_1 = __importDefault(require("../modules/organizations/organization.routes"));
const event_routes_1 = __importDefault(require("../modules/events/event.routes"));
const attendee_profile_routes_1 = __importDefault(require("../modules/attendee-profile/attendee-profile.routes"));
const ticket_routes_1 = __importDefault(require("../modules/tickets/ticket.routes"));
const revenue_routes_1 = __importDefault(require("../modules/revenue/revenue.routes"));
const purchase_routes_1 = __importDefault(require("../modules/purchases/purchase.routes"));
const stripe_routes_1 = __importDefault(require("../modules/stripe/stripe.routes"));
const pass_routes_1 = __importDefault(require("../modules/pass/pass.routes"));
const operations_routes_1 = __importDefault(require("../modules/operations/operations.routes"));
const staff_routes_1 = __importDefault(require("../modules/events/staff.routes"));
const router = (0, express_1.Router)();
router.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "WowYou EventTech API",
    });
});
router.use(test_routes_1.default);
router.use("/auth", auth_routes_1.default);
router.use("/organizations", organization_routes_1.default);
router.use("/events", event_routes_1.default);
router.use("/attendee-profile", attendee_profile_routes_1.default);
router.use("/tickets", ticket_routes_1.default);
router.use("/revenue", revenue_routes_1.default);
router.use("/purchases", purchase_routes_1.default);
router.use("/stripe", stripe_routes_1.default);
router.use("/passes", pass_routes_1.default);
router.use("/operations", operations_routes_1.default);
router.use("/staff", staff_routes_1.default);
exports.default = router;
