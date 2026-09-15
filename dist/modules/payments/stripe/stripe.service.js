"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripe = getStripe;
exports.createStripeCheckoutSession = createStripeCheckoutSession;
exports.getStripeCheckoutSession = getStripeCheckoutSession;
exports.getStripePaymentIntent = getStripePaymentIntent;
exports.constructStripeWebhookEvent = constructStripeWebhookEvent;
const stripe_1 = __importDefault(require("stripe"));
/*
|--------------------------------------------------------------------------
| Stripe Client
|--------------------------------------------------------------------------
*/
let stripeClient = null;
function getStripe() {
    if (!stripeClient) {
        const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
        if (!secretKey) {
            throw new Error("STRIPE_SECRET_KEY is missing.");
        }
        stripeClient = new stripe_1.default(secretKey);
    }
    return stripeClient;
}
/*
|--------------------------------------------------------------------------
| Create Attendee Ticket Checkout
|--------------------------------------------------------------------------
|
| IMPORTANT MONEY FLOW
|
| Attendee
|    ↓
| Stripe Checkout
|    ↓
| WowYou Stripe Platform
|    ↓
| HOLD
|    ↓
| Event ends + 24 hours
|    ↓
| Settlement Engine
|    ↓
| Stripe Transfer
|    ↓
| Organizer Connected Account
|    ↓
| Stripe Payout
|    ↓
| Organizer Bank
|
| There is intentionally NO:
|
| - transfer_data.destination
| - application_fee_amount
| - connected account header
|
| The initial ticket charge belongs to WowYou.
|
|--------------------------------------------------------------------------
*/
async function createStripeCheckoutSession(input) {
    /*
    |--------------------------------------------------------------------------
    | Validate Amount
    |--------------------------------------------------------------------------
    |
    | Amount is already expressed in the smallest currency unit.
    |
    | Example:
    |
    | USD 25.00 → 2500
    | NGN 25,000 → 2500000
    |
    |--------------------------------------------------------------------------
    */
    if (!Number.isInteger(input.amount) ||
        input.amount < 1) {
        throw new Error("Invalid Stripe checkout amount.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Currency
    |--------------------------------------------------------------------------
    */
    const currency = String(input.currency ?? "")
        .trim()
        .toLowerCase();
    if (!currency) {
        throw new Error("Stripe checkout currency is required.");
    }
    if (!/^[a-z]{3}$/.test(currency)) {
        throw new Error("Stripe checkout currency must be a valid 3-letter currency code.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Purchase ID
    |--------------------------------------------------------------------------
    */
    const purchaseId = String(input.purchaseId ?? "").trim();
    if (!purchaseId) {
        throw new Error("Purchase ID is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate User ID
    |--------------------------------------------------------------------------
    */
    const userId = String(input.userId ?? "").trim();
    if (!userId) {
        throw new Error("User ID is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Event ID
    |--------------------------------------------------------------------------
    */
    const eventId = String(input.eventId ?? "").trim();
    if (!eventId) {
        throw new Error("Event ID is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Ticket Type ID
    |--------------------------------------------------------------------------
    */
    const ticketTypeId = String(input.ticketTypeId ?? "").trim();
    if (!ticketTypeId) {
        throw new Error("Ticket type ID is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Product Name
    |--------------------------------------------------------------------------
    */
    const productName = String(input.productName ?? "").trim();
    if (!productName) {
        throw new Error("Stripe checkout product name is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Success URL
    |--------------------------------------------------------------------------
    */
    const successUrl = String(input.successUrl ?? "").trim();
    if (!successUrl) {
        throw new Error("Stripe success URL is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Cancel URL
    |--------------------------------------------------------------------------
    */
    const cancelUrl = String(input.cancelUrl ?? "").trim();
    if (!cancelUrl) {
        throw new Error("Stripe cancel URL is required.");
    }
    /*
    |--------------------------------------------------------------------------
    | Validate Customer Email
    |--------------------------------------------------------------------------
    */
    const customerEmail = input.customerEmail
        ? String(input.customerEmail).trim()
        : null;
    /*
    |--------------------------------------------------------------------------
    | Stripe Client
    |--------------------------------------------------------------------------
    */
    const stripe = getStripe();
    /*
    |--------------------------------------------------------------------------
    | Stripe Metadata
    |--------------------------------------------------------------------------
    |
    | Metadata gives the webhook enough information to identify
    | the exact WowYou purchase.
    |
    |--------------------------------------------------------------------------
    */
    const metadata = {
        purchaseId,
        userId,
        eventId,
        ticketTypeId,
    };
    /*
    |--------------------------------------------------------------------------
    | Create Checkout Session
    |--------------------------------------------------------------------------
    |
    | We deliberately do NOT specify a connected account.
    |
    | This means the payment is created on the WowYou platform.
    |
    |--------------------------------------------------------------------------
    */
    const session = await stripe.checkout.sessions.create({
        /*
        |--------------------------------------------------------------------------
        | Payment Mode
        |--------------------------------------------------------------------------
        */
        mode: "payment",
        /*
        |--------------------------------------------------------------------------
        | WowYou Purchase Reference
        |--------------------------------------------------------------------------
        */
        client_reference_id: purchaseId,
        /*
        |--------------------------------------------------------------------------
        | Ticket Line Item
        |--------------------------------------------------------------------------
        |
        | input.amount is the COMPLETE purchase amount.
        |
        | Example:
        |
        | Ticket = ₦10,000
        | Quantity = 3
        |
        | purchase amount = ₦30,000
        |
        | Stripe receives:
        |
        | unit_amount = 30,000 × 100
        | quantity = 1
        |
        | We do this because WowYou has already calculated
        | the complete purchase total.
        |
        |--------------------------------------------------------------------------
        */
        line_items: [
            {
                price_data: {
                    currency,
                    product_data: {
                        name: productName,
                    },
                    unit_amount: input.amount,
                },
                quantity: 1,
            },
        ],
        /*
        |--------------------------------------------------------------------------
        | Customer Email
        |--------------------------------------------------------------------------
        */
        ...(customerEmail
            ? {
                customer_email: customerEmail,
            }
            : {}),
        /*
        |--------------------------------------------------------------------------
        | Checkout Metadata
        |--------------------------------------------------------------------------
        */
        metadata,
        /*
        |--------------------------------------------------------------------------
        | PaymentIntent Metadata
        |--------------------------------------------------------------------------
        |
        | The metadata is copied to the underlying PaymentIntent.
        |
        | This is useful when handling:
        |
        | payment_intent.succeeded
        | payment_intent.payment_failed
        |
        |--------------------------------------------------------------------------
        */
        payment_intent_data: {
            metadata,
        },
        /*
        |--------------------------------------------------------------------------
        | Success URL
        |--------------------------------------------------------------------------
        |
        | The browser redirect is NOT payment confirmation.
        |
        | The webhook is authoritative.
        |
        |--------------------------------------------------------------------------
        */
        success_url: successUrl,
        /*
        |--------------------------------------------------------------------------
        | Cancel URL
        |--------------------------------------------------------------------------
        */
        cancel_url: cancelUrl,
        /*
        |--------------------------------------------------------------------------
        | Billing Address
        |--------------------------------------------------------------------------
        */
        billing_address_collection: "auto",
    }, {
        /*
        |--------------------------------------------------------------------------
        | Idempotency
        |--------------------------------------------------------------------------
        |
        | Prevent duplicate Stripe Checkout Sessions for the
        | same WowYou purchase.
        |
        |--------------------------------------------------------------------------
        */
        idempotencyKey: input.idempotencyKey?.trim() ||
            `purchase_${purchaseId}`,
    });
    /*
    |--------------------------------------------------------------------------
    | Validate Checkout URL
    |--------------------------------------------------------------------------
    */
    if (!session.url) {
        throw new Error("Stripe did not return a checkout URL.");
    }
    /*
    |--------------------------------------------------------------------------
    | Return Checkout Information
    |--------------------------------------------------------------------------
    */
    return {
        sessionId: session.id,
        checkoutUrl: session.url,
        paymentStatus: session.payment_status,
    };
}
/*
|--------------------------------------------------------------------------
| Retrieve Checkout Session
|--------------------------------------------------------------------------
|
| Used by the webhook to independently retrieve the Checkout Session
| before confirming the WowYou purchase.
|
|--------------------------------------------------------------------------
*/
async function getStripeCheckoutSession(sessionId) {
    const normalizedSessionId = String(sessionId ?? "").trim();
    if (!normalizedSessionId) {
        throw new Error("Stripe checkout session ID is required.");
    }
    const stripe = getStripe();
    return stripe.checkout.sessions.retrieve(normalizedSessionId, {
        expand: [
            "payment_intent",
        ],
    });
}
/*
|--------------------------------------------------------------------------
| Retrieve PaymentIntent
|--------------------------------------------------------------------------
*/
async function getStripePaymentIntent(paymentIntentId) {
    const normalizedPaymentIntentId = String(paymentIntentId ?? "").trim();
    if (!normalizedPaymentIntentId) {
        throw new Error("Stripe payment intent ID is required.");
    }
    const stripe = getStripe();
    return stripe.paymentIntents.retrieve(normalizedPaymentIntentId);
}
/*
|--------------------------------------------------------------------------
| Construct Stripe Webhook Event
|--------------------------------------------------------------------------
|
| Stripe signature verification requires the ORIGINAL raw request body.
|
| Therefore app.ts must mount the Stripe webhook BEFORE express.json().
|
|--------------------------------------------------------------------------
*/
function constructStripeWebhookEvent(rawBody, signature) {
    /*
    |--------------------------------------------------------------------------
    | Webhook Secret
    |--------------------------------------------------------------------------
    */
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET is missing.");
    }
    /*
    |--------------------------------------------------------------------------
    | Signature
    |--------------------------------------------------------------------------
    */
    const normalizedSignature = String(signature ?? "").trim();
    if (!normalizedSignature) {
        throw new Error("Stripe signature is missing.");
    }
    /*
    |--------------------------------------------------------------------------
    | Raw Body
    |--------------------------------------------------------------------------
    */
    if (!rawBody) {
        throw new Error("Stripe webhook raw body is empty.");
    }
    if (Buffer.isBuffer(rawBody)) {
        if (rawBody.length === 0) {
            throw new Error("Stripe webhook raw body is empty.");
        }
    }
    else if (rawBody.length === 0) {
        throw new Error("Stripe webhook raw body is empty.");
    }
    /*
    |--------------------------------------------------------------------------
    | Verify Stripe Signature
    |--------------------------------------------------------------------------
    */
    const stripe = getStripe();
    return stripe.webhooks.constructEvent(rawBody, normalizedSignature, webhookSecret);
}
