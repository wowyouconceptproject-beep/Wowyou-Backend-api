"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const revolut_controller_1 = require("./revolut.controller");
const revolut_return_controller_1 = require("./revolut-return.controller");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Revolut Webhook
|--------------------------------------------------------------------------
|
| NO authentication middleware here.
|
| Revolut authenticates itself using the signed webhook.
|
*/
router.post("/webhook", revolut_controller_1.webhook);
/*
|--------------------------------------------------------------------------
| Payment Return
|--------------------------------------------------------------------------
|
| Revolut redirects the customer here after checkout.
|
*/
router.get("/return", revolut_return_controller_1.paymentReturn);
exports.default = router;
