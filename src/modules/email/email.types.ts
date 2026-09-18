export type EmailType =
  | "EMAIL_VERIFICATION"
  | "LOGIN_OTP"
  | "TICKET_PURCHASE"
  | "ORGANIZER_TICKET_SALE"
  | "EVENT_REMINDER"
  | "EVENT_THANK_YOU";

export type EmailDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "FAILED";

export interface SendEmailInput {
  type: EmailType;
  to: string;
  subject: string;
  html: string;
  text?: string;

  userId?: string;
  purchaseId?: string;
  eventId?: string;

  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
    contentId?: string;
  }>;

  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
}