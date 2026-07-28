"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const search_1 = require("./modules/search");
const revolut_routes_1 = __importDefault(require("./modules/payments/revolut/revolut.routes"));
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
| Revolut Webhook
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This MUST be registered before express.json().
|
| Revolut webhook signature verification requires the exact raw request
| body that Revolut signed.
|
| Final endpoint:
|
| POST /payments/revolut/webhook
|
*/
app.use("/payments/revolut", express_1.default.raw({
    type: "application/json",
}), revolut_routes_1.default);
/*
|--------------------------------------------------------------------------
| JSON Parser
|--------------------------------------------------------------------------
|
| Everything below this point receives normal parsed JSON.
|
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
exports.default = app;
