"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRevolutOrder = createRevolutOrder;
exports.getRevolutOrder = getRevolutOrder;
exports.createRevolutCustomer = createRevolutCustomer;
exports.createRevolutSubscription = createRevolutSubscription;
exports.getRevolutSubscription = getRevolutSubscription;
exports.cancelRevolutSubscription = cancelRevolutSubscription;
exports.verifyRevolutWebhook = verifyRevolutWebhook;
const crypto_1 = __importDefault(require("crypto"));
/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/
const REVOLUT_API_URL = process.env.REVOLUT_API_URL ??
    "https://merchant.revolut.com/api";
const REVOLUT_API_VERSION = process.env.REVOLUT_API_VERSION ??
    "2026-04-20";
/*
|--------------------------------------------------------------------------
| Secret Key
|--------------------------------------------------------------------------
*/
function getSecretKey() {
    const key = process.env.REVOLUT_SECRET_KEY;
    if (!key) {
        throw new Error("REVOLUT_SECRET_KEY is missing.");
    }
    return key;
}
/*
|--------------------------------------------------------------------------
| Webhook Secret
|--------------------------------------------------------------------------
*/
function getWebhookSecret() {
    const secret = process.env.REVOLUT_WEBHOOK_SECRET;
    if (!secret) {
        throw new Error("REVOLUT_WEBHOOK_SECRET is missing.");
    }
    return secret;
}
/*
|--------------------------------------------------------------------------
| Revolut Request
|--------------------------------------------------------------------------
*/
async function revolutRequest(path, options = {}) {
    const response = await fetch(`${REVOLUT_API_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${getSecretKey()}`,
            "Content-Type": "application/json",
            "Revolut-Api-Version": REVOLUT_API_VERSION,
            ...(options.headers ?? {}),
        },
    });
    const raw = await response.text();
    let data = {};
    if (raw) {
        try {
            data =
                JSON.parse(raw);
        }
        catch {
            data = {
                message: raw,
            };
        }
    }
    if (!response.ok) {
        console.error("REVOLUT API ERROR:", {
            path,
            status: response.status,
            data,
        });
        throw new Error(data?.message ??
            data?.error ??
            `Revolut returned HTTP ${response.status}.`);
    }
    return data;
}
/*
|--------------------------------------------------------------------------
| Create Attendee Order
|--------------------------------------------------------------------------
*/
async function createRevolutOrder(input) {
    if (!Number.isInteger(input.amount) ||
        input.amount < 1) {
        throw new Error("Invalid Revolut order amount.");
    }
    const body = {
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        description: input.description,
        merchant_order_data: {
            reference: input.purchaseId,
        },
        metadata: {
            purchaseId: input.purchaseId,
            userId: input.userId,
            eventId: input.eventId,
            ticketTypeId: input.ticketTypeId,
        },
    };
    if (input.redirectUrl) {
        body.redirect_url =
            input.redirectUrl;
    }
    return revolutRequest("/orders", {
        method: "POST",
        headers: {
            "Idempotency-Key": input.purchaseId,
        },
        body: JSON.stringify(body),
    });
}
/*
|--------------------------------------------------------------------------
| Get Order
|--------------------------------------------------------------------------
*/
async function getRevolutOrder(orderId) {
    if (!orderId) {
        throw new Error("Revolut order ID is required.");
    }
    return revolutRequest(`/orders/${encodeURIComponent(orderId)}`);
}
/*
|--------------------------------------------------------------------------
| Create Customer
|--------------------------------------------------------------------------
*/
async function createRevolutCustomer(input) {
    const fullName = input.fullName.trim();
    const email = input.email
        .trim()
        .toLowerCase();
    if (!email) {
        throw new Error("Customer email is required.");
    }
    return revolutRequest("/customers", {
        method: "POST",
        body: JSON.stringify({
            full_name: fullName,
            email,
        }),
    });
}
/*
|--------------------------------------------------------------------------
| Create Subscription
|--------------------------------------------------------------------------
|
| Revolut flow:
|
| 1. Customer must exist.
| 2. Create subscription using a plan variation.
| 3. Revolut returns setup_order_id.
| 4. Retrieve setup order.
| 5. Redirect organizer to checkout_url.
|
*/
async function createRevolutSubscription(input) {
    if (!input.customerId) {
        throw new Error("Revolut customer ID is required.");
    }
    if (!input.planVariationId) {
        throw new Error("Revolut plan variation ID is required.");
    }
    if (!input.externalReference) {
        throw new Error("Revolut external reference is required.");
    }
    if (!input.redirectUrl) {
        throw new Error("Revolut subscription redirect URL is required.");
    }
    if (!input.idempotencyKey) {
        throw new Error("Revolut idempotency key is required.");
    }
    return revolutRequest("/subscriptions", {
        method: "POST",
        headers: {
            "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
            customer_id: input.customerId,
            plan_variation_id: input.planVariationId,
            external_reference: input.externalReference,
            setup_order_redirect_url: input.redirectUrl,
        }),
    });
}
/*
|--------------------------------------------------------------------------
| Get Subscription
|--------------------------------------------------------------------------
*/
async function getRevolutSubscription(subscriptionId) {
    if (!subscriptionId) {
        throw new Error("Revolut subscription ID is required.");
    }
    return revolutRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}
/*
|--------------------------------------------------------------------------
| Cancel Subscription
|--------------------------------------------------------------------------
*/
async function cancelRevolutSubscription(subscriptionId) {
    if (!subscriptionId) {
        throw new Error("Revolut subscription ID is required.");
    }
    return revolutRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
        method: "POST",
    });
}
/*
|--------------------------------------------------------------------------
| Verify Webhook
|--------------------------------------------------------------------------
|
| Revolut signs:
|
| v1.TIMESTAMP.RAW_BODY
|
*/
function verifyRevolutWebhook(rawBody, timestamp, signatureHeader) {
    if (!rawBody ||
        !timestamp ||
        !signatureHeader) {
        return false;
    }
    /*
    |--------------------------------------------------------------------------
    | Replay Protection
    |--------------------------------------------------------------------------
    */
    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber)) {
        return false;
    }
    const now = Date.now();
    const difference = Math.abs(now -
        timestampNumber);
    const fiveMinutes = 5 * 60 * 1000;
    if (difference >
        fiveMinutes) {
        return false;
    }
    /*
    |--------------------------------------------------------------------------
    | Build Signed Payload
    |--------------------------------------------------------------------------
    */
    const payload = `v1.${timestamp}.${rawBody}`;
    const digest = crypto_1.default
        .createHmac("sha256", getWebhookSecret())
        .update(payload)
        .digest("hex");
    const expected = `v1=${digest}`;
    /*
    |--------------------------------------------------------------------------
    | Multiple Signatures
    |--------------------------------------------------------------------------
    */
    const signatures = signatureHeader
        .split(",")
        .map((value) => value.trim());
    return signatures.some((signature) => {
        try {
            const actualBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(expected);
            if (actualBuffer.length !==
                expectedBuffer.length) {
                return false;
            }
            return crypto_1.default.timingSafeEqual(actualBuffer, expectedBuffer);
        }
        catch {
            return false;
        }
    });
}
