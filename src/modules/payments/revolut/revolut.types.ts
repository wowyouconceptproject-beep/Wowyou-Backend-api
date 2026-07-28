export interface RevolutOrder {
  id: string;

  token?: string;

  type?: string;

  state: string;

  amount: number;

  currency: string;

  checkout_url?: string;

  redirect_url?: string;

  created_at?: string;

  updated_at?: string;

  description?: string;

  merchant_order_ext_ref?: string;

  metadata?: Record<
    string,
    string
  >;
}

export interface CreateRevolutOrderInput {
  amount: number;

  currency: string;

  purchaseId: string;

  userId: string;

  eventId: string;

  ticketTypeId: string;

  description: string;

  redirectUrl?: string;
}

export interface RevolutWebhookPayload {
  event: string;

  order_id: string;

  merchant_order_ext_ref?: string;
}