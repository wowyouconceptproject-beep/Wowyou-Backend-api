"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const search_1 = require("./modules/search");
const stripe_routes_1 = __importDefault(require("./modules/payments/stripe/stripe.routes"));
const intelligence_routes_1 = __importDefault(require("./modules/intelligence/intelligence.routes"));
const app = (0, express_1.default)();
/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/
app.use((0, helmet_1.default)());
/*
|--------------------------------------------------------------------------
| Logging
|--------------------------------------------------------------------------
*/
app.use((0, morgan_1.default)("dev"));
/*
|--------------------------------------------------------------------------
| Stripe Webhook
|--------------------------------------------------------------------------
|
| Stripe signature verification requires the ORIGINAL raw request body.
|
| IMPORTANT:
| This MUST be registered BEFORE express.json().
|
| Endpoint:
|
| POST /api/stripe/webhook
|
*/
app.post("/api/stripe/webhook", express_1.default.raw({
    type: "application/json",
}), async (req, res, next) => {
    try {
        const { webhook, } = await Promise.resolve().then(() => __importStar(require("./modules/payments/stripe/stripe.controller")));
        return webhook(req, res);
    }
    catch (error) {
        return next(error);
    }
});
/*
|--------------------------------------------------------------------------
| JSON Parser
|--------------------------------------------------------------------------
*/
app.use(express_1.default.json({
    limit: "10mb",
}));
/*
|--------------------------------------------------------------------------
| Search
|--------------------------------------------------------------------------
*/
app.use("/search", search_1.searchRoutes);
/*
|--------------------------------------------------------------------------
| Stripe Routes
|--------------------------------------------------------------------------
|
| /api/stripe/...
|
| The webhook is handled above because Stripe requires
| the raw request body for signature verification.
|
*/
app.use("/api/stripe", stripe_routes_1.default);
/*
|--------------------------------------------------------------------------
| Event Intelligence
|--------------------------------------------------------------------------
*/
app.use("/api", intelligence_routes_1.default);
exports.default = app;
