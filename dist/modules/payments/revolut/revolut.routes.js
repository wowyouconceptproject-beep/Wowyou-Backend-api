"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const revolut_controller_1 = require("./revolut.controller");
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
exports.default = router;
