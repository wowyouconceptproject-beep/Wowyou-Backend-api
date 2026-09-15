import Stripe from "stripe";

/*
|--------------------------------------------------------------------------
| Stripe Checkout Payment Status
|--------------------------------------------------------------------------
*/

export type StripeCheckoutPaymentStatus =
  | "paid"
  | "unpaid"
  | "no_payment_required";

/*
|--------------------------------------------------------------------------
| Stripe Checkout Mode
|--------------------------------------------------------------------------
*/

export type StripeCheckoutMode =
  | "payment"
  | "subscription"
  | "setup";

/*
|--------------------------------------------------------------------------
| Stripe Checkout Input
|--------------------------------------------------------------------------
|
| Ticket payments are charged to the WowYou Stripe platform.
|
| We intentionally do NOT pass a connected account here.
|
| Money flow:
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
|
|--------------------------------------------------------------------------
*/

export interface CreateStripeCheckoutSessionInput {
  purchaseId: string;

  userId: string;

  eventId: string;

  ticketTypeId: string;

  /**
   * Total purchase amount in the smallest currency unit.
   *
   * Example:
   * USD $25.00 → 2500
   * NGN ₦25,000 → 2500000
   */
  amount: number;

  currency: string;

  productName: string;

  quantity?: number;

  customerEmail?: string | null;

  successUrl: string;

  cancelUrl: string;

  idempotencyKey?: string;
}

/*
|--------------------------------------------------------------------------
| Stripe Checkout Result
|--------------------------------------------------------------------------
*/

export interface StripeCheckoutResult {
  sessionId: string;

  checkoutUrl: string | null;

  paymentStatus: StripeCheckoutPaymentStatus;
}

/*
|--------------------------------------------------------------------------
| Stripe Webhook Event
|--------------------------------------------------------------------------
*/

export type StripeWebhookEvent = Stripe.Event;

/*
|--------------------------------------------------------------------------
| Stripe Checkout Session
|--------------------------------------------------------------------------
*/

export type StripeCheckoutSession =
  Stripe.Checkout.Session;

/*
|--------------------------------------------------------------------------
| Stripe Payment Intent
|--------------------------------------------------------------------------
*/

export type StripePaymentIntent =
  Stripe.PaymentIntent;

/*
|--------------------------------------------------------------------------
| Stripe Customer
|--------------------------------------------------------------------------
*/

export type StripeCustomer =
  Stripe.Customer;

/*
|--------------------------------------------------------------------------
| Stripe Subscription
|--------------------------------------------------------------------------
*/

export type StripeSubscription =
  Stripe.Subscription;

/*
|--------------------------------------------------------------------------
| Stripe Invoice
|--------------------------------------------------------------------------
*/

export type StripeInvoice =
  Stripe.Invoice;

/*
|--------------------------------------------------------------------------
| Stripe Account
|--------------------------------------------------------------------------
*/

export type StripeAccount =
  Stripe.Account;

/*
|--------------------------------------------------------------------------
| Stripe Transfer
|--------------------------------------------------------------------------
*/

export type StripeTransfer =
  Stripe.Transfer;

/*
|--------------------------------------------------------------------------
| Stripe Payout
|--------------------------------------------------------------------------
*/

export type StripePayout =
  Stripe.Payout;