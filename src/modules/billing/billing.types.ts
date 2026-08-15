import {
  OrganizerPlan,
} from "@prisma/client";

/*
|--------------------------------------------------------------------------
| Get Plans
|--------------------------------------------------------------------------
*/

export interface GetPlansResponse {
  success: boolean;

  plans: OrganizerPlanConfigResponse[];
}

/*
|--------------------------------------------------------------------------
| Plan Configuration
|--------------------------------------------------------------------------
*/

export interface OrganizerPlanConfigResponse {
  plan: OrganizerPlan;

  name: string;

  amount: number;

  currency: string;

  interval: string;

  description: string;

  features: string[];
}

/*
|--------------------------------------------------------------------------
| Create Checkout
|--------------------------------------------------------------------------
*/

export interface CreateCheckoutRequest {
  plan: OrganizerPlan;

  fullName: string;

  email: string;

  redirectUrl: string;
}

/*
|--------------------------------------------------------------------------
| Create Checkout Response
|--------------------------------------------------------------------------
*/

export interface CreateCheckoutResponse {
  success: boolean;

  checkoutUrl: string;

  subscriptionId: string;

  revolutSubscriptionId: string;

  setupOrderId: string;
}

/*
|--------------------------------------------------------------------------
| Subscription Response
|--------------------------------------------------------------------------
*/

export interface OrganizationSubscriptionResponse {
  success: boolean;

  subscription: {
    id: string;

    organizationId: string;

    plan: OrganizerPlan;

    status: string;

    currency: string;

    amount: string | number;

    interval: string;

    provider?: string | null;

    providerCustomerId?: string | null;

    providerSubscriptionId?: string | null;

    providerPriceId?: string | null;

    providerSetupOrderId?: string | null;

    currentPeriodStart?: string | null;

    currentPeriodEnd?: string | null;

    cancelAtPeriodEnd: boolean;

    canceledAt?: string | null;

    createdAt: string;

    updatedAt: string;
  } | null;
}