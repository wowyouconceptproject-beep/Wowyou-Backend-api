
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { prisma } from "../../lib/prisma";

import { issuePurchase } from "./ticket-issuance.service";

import { sendVerificationEmail } from "../auth/email-verification.service";

export type ManualPaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "POS"
  | "OTHER";

export interface RecordManualSaleInput {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  paymentMethod: ManualPaymentMethod;
  paymentReference?: string;
}

const ALLOWED_PAYMENT_METHODS: ManualPaymentMethod[] = [
  "CASH",
  "BANK_TRANSFER",
  "POS",
  "OTHER",
];

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function validateInput(input: RecordManualSaleInput) {
  if (!input.eventId?.trim()) {
    throw new Error("Event is required.");
  }

  if (!input.ticketTypeId?.trim()) {
    throw new Error("Ticket type is required.");
  }

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  if (!normalizeText(input.firstName)) {
    throw new Error("Buyer first name is required.");
  }

  if (!normalizeText(input.lastName)) {
    throw new Error("Buyer last name is required.");
  }

  const email = normalizeEmail(input.email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid buyer email address.");
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(input.paymentMethod)) {
    throw new Error("Invalid offline payment method.");
  }

  const reference = normalizeText(input.paymentReference);

  if (reference.length > 150) {
    throw new Error("Payment reference cannot exceed 150 characters.");
  }

  const phone = normalizeText(input.phone);

  if (phone.length > 40) {
    throw new Error("Phone number cannot exceed 40 characters.");
  }

  return {
    email,
    firstName: normalizeText(input.firstName),
    lastName: normalizeText(input.lastName),
    phone,
    reference,
  };
}

export async function recordManualSale(
  organizerId: string,
  input: RecordManualSaleInput,
) {
  if (!organizerId) {
    throw new Error("Authentication required.");
  }

  const normalized = validateInput(input);

  /*
   * A random password is generated only as a secure credential placeholder.
   * It is never returned or emailed to the buyer.
   */
  const generatedPassword = crypto.randomBytes(32).toString("hex");
  const hashedPassword = await bcrypt.hash(generatedPassword, 10);

  const result = await prisma.$transaction(
    async (tx) => {
      const ticket = await tx.ticketType.findUnique({
        where: {
          id: input.ticketTypeId,
        },
        include: {
          event: {
            include: {
              organization: {
                select: {
                  ownerId: true,
                },
              },
            },
          },
        },
      });

      if (!ticket || ticket.eventId !== input.eventId) {
        throw new Error("Ticket type does not belong to this event.");
      }

      if (ticket.event.organization.ownerId !== organizerId) {
        throw new Error("You are not authorized to sell tickets for this event.");
      }

      if (!ticket.isActive) {
        throw new Error("This ticket type is inactive.");
      }

      if (ticket.event.status === "CANCELLED") {
        throw new Error("Tickets cannot be issued for a cancelled event.");
      }

      if (ticket.event.endDate <= new Date()) {
        throw new Error("Tickets cannot be issued for an event that has ended.");
      }

      const remaining = ticket.quantity - ticket.sold;

      if (remaining < input.quantity) {
        throw new Error(
          remaining <= 0
            ? "This ticket type is sold out."
            : `Only ${remaining} ticket${remaining === 1 ? "" : "s"} remaining.`,
        );
      }

      let buyer = await tx.user.findUnique({
        where: {
          email: normalized.email,
        },
      });

      let accountCreated = false;

      if (buyer) {
        if (!buyer.isActive) {
          throw new Error(
            "The buyer's existing account is inactive. Contact support before issuing tickets.",
          );
        }

        // Preserve existing roles, passwords, and account verification.
      } else {
        buyer = await tx.user.create({
          data: {
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            email: normalized.email,
            phone: normalized.phone || null,
            password: hashedPassword,
            role: "ATTENDEE",
          },
        });

        accountCreated = true;
      }

      /*
       * Conditional inventory update prevents concurrent sales from
       * overselling the same ticket type.
       */
      const inventoryUpdate = await tx.ticketType.updateMany({
        where: {
          id: ticket.id,
          isActive: true,
          sold: {
            lte: ticket.quantity - input.quantity,
          },
        },
        data: {
          sold: {
            increment: input.quantity,
          },
        },
      });

      if (inventoryUpdate.count !== 1) {
        throw new Error(
          "Ticket inventory changed while recording this sale. Please try again.",
        );
      }

      const subtotal = Number(ticket.price) * input.quantity;

      if (!Number.isFinite(subtotal) || subtotal < 0) {
        throw new Error("Invalid ticket price.");
      }

      const purchase = await tx.ticketPurchase.create({
        data: {
          userId: buyer.id,
          eventId: ticket.eventId,
          ticketTypeId: ticket.id,
          quantity: input.quantity,

          subtotal,
          transactionFee: 0,
          feeFxRate: null,
          amount: subtotal,
          currency: ticket.event.currency.trim().toUpperCase(),

          paymentProvider: "MANUAL",
          paymentMethod: input.paymentMethod,
          paymentReference: normalized.reference || null,
          gatewayStatus: "COMPLETED",
          status: "PAID",
          paymentCompletedAt: new Date(),
        },
      });

      return {
        purchase,
        buyerId: buyer.id,
        buyerEmail: buyer.email,
        accountCreated,
      };
    },
  );

  /*
   * The sale is already committed. Pass issuance and emails are attempted
   * afterward, so a delivery failure cannot roll back or duplicate the sale.
   */
  let passesIssued = false;
  let passCount = 0;

  try {
    const passes = await issuePurchase(result.purchase.id);
    passesIssued = passes.length >= result.purchase.quantity;
    passCount = passes.length;
  } catch (error) {
    console.error(
      "MANUAL SALE PASS ISSUANCE ERROR:",
      {
        purchaseId: result.purchase.id,
        error,
      },
    );
  }

  let verificationEmailSent = false;

  if (result.accountCreated) {
    try {
      await sendVerificationEmail(result.buyerId);
      verificationEmailSent = true;
    } catch (error) {
      console.error(
        "MANUAL SALE ACCOUNT VERIFICATION EMAIL ERROR:",
        {
          buyerId: result.buyerId,
          error,
        },
      );
    }
  }

  return {
    purchase: result.purchase,
    buyer: {
      id: result.buyerId,
      email: result.buyerEmail,
    },
    accountCreated: result.accountCreated,
    verificationEmailSent,
    passesIssued,
    passCount,
  };
}
