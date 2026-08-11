import { prisma } from "../../lib/prisma";

import {
  createRevolutOrder,
} from "../payments/revolut/revolut.service";

import {
  issuePurchase,
} from "./ticket-issuance.service";

/*
|--------------------------------------------------------------------------
| Currency Minor Units
|--------------------------------------------------------------------------
*/

function toMinorUnits(
  amount: number,
  currency: string,
) {
  const normalized =
    currency
      .trim()
      .toUpperCase();

  const zeroDecimal =
    new Set([
      "BIF",
      "CLP",
      "DJF",
      "GNF",
      "ISK",
      "JPY",
      "KMF",
      "KRW",
      "PYG",
      "RWF",
      "UGX",
      "VND",
      "VUV",
      "XAF",
      "XOF",
      "XPF",
    ]);

  if (
    zeroDecimal.has(
      normalized,
    )
  ) {
    return Math.round(
      amount,
    );
  }

  return Math.round(
    amount * 100,
  );
}

/*
|--------------------------------------------------------------------------
| Create Purchase
|--------------------------------------------------------------------------
*/

export async function createPurchase(
  userId: string,
  ticketTypeId: string,
  quantity: number,
) {
  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  if (!userId) {
    throw new Error(
      "User ID is required.",
    );
  }

  if (!ticketTypeId) {
    throw new Error(
      "Ticket type is required.",
    );
  }

  if (
    !Number.isInteger(
      quantity,
    ) ||
    quantity < 1
  ) {
    throw new Error(
      "Quantity must be at least 1.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Load Ticket
  |--------------------------------------------------------------------------
  */

  const ticket =
    await prisma.ticketType.findUnique({
      where: {
        id: ticketTypeId,
      },

      include: {
        event: true,
      },
    });

  if (!ticket) {
    throw new Error(
      "Ticket not found.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Availability
  |--------------------------------------------------------------------------
  */

  if (!ticket.isActive) {
    throw new Error(
      "Ticket unavailable.",
    );
  }

  if (
    ticket.event.status !==
    "PUBLISHED"
  ) {
    throw new Error(
      "This event is not published.",
    );
  }

  const now = new Date();

  if (
    ticket.event.endDate <=
    now
  ) {
    throw new Error(
      "This event has already ended.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Inventory
  |--------------------------------------------------------------------------
  */

  const remaining =
    ticket.quantity -
    ticket.sold;

  if (remaining <= 0) {
    throw new Error(
      "This ticket is sold out.",
    );
  }

  if (
    quantity >
    remaining
  ) {
    throw new Error(
      `Only ${remaining} ticket${
        remaining === 1
          ? ""
          : "s"
      } remaining.`,
    );
  }

 /*
|--------------------------------------------------------------------------
| Amount
|--------------------------------------------------------------------------
*/

const currency =
  ticket.event.currency
    .trim()
    .toUpperCase();

const unitPrice =
  Number(
    ticket.price,
  );

if (
  !Number.isFinite(
    unitPrice,
  ) ||
  unitPrice < 0
) {
  throw new Error(
    "Invalid ticket price.",
  );
}

const amount =
  unitPrice * quantity;

if (
  !Number.isFinite(
    amount,
  ) ||
  amount < 0
) {
  throw new Error(
    "Invalid purchase amount.",
  );
}

/*
|--------------------------------------------------------------------------
| Free Ticket
|--------------------------------------------------------------------------
*/

if (amount === 0) {
  /*
  |--------------------------------------------------------------------------
  | Transaction
  |--------------------------------------------------------------------------
  */

  const purchase =
    await prisma.$transaction(
      async (tx) => {
        /*
        |--------------------------------------------------------------------------
        | Reload Ticket
        |--------------------------------------------------------------------------
        */

        const currentTicket =
          await tx.ticketType.findUnique({
            where: {
              id: ticketTypeId,
            },
          });

        if (!currentTicket) {
          throw new Error(
            "Ticket not found.",
          );
        }

        if (!currentTicket.isActive) {
          throw new Error(
            "Ticket unavailable.",
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Inventory Check
        |--------------------------------------------------------------------------
        */

        const remaining =
          currentTicket.quantity -
          currentTicket.sold;

        if (
          remaining <
          quantity
        ) {
          throw new Error(
            remaining <= 0
              ? "This ticket is sold out."
              : `Only ${remaining} ticket${
                  remaining === 1
                    ? ""
                    : "s"
                } remaining.`,
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Reserve Inventory
        |--------------------------------------------------------------------------
        */

        const inventory =
          await tx.ticketType.updateMany({
            where: {
              id: ticketTypeId,

              isActive: true,

              sold: {
                lte:
                  currentTicket.quantity -
                  quantity,
              },
            },

            data: {
              sold: {
                increment:
                  quantity,
              },
            },
          });

        if (
          inventory.count !==
          1
        ) {
          throw new Error(
            "Ticket inventory changed. Please try again.",
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Create Purchase
        |--------------------------------------------------------------------------
        */

        return tx.ticketPurchase.create({
          data: {
            userId,

            eventId:
              ticket.eventId,

            ticketTypeId,

            quantity,

            amount,

            currency,

            paymentProvider:
              "FREE",

            paymentReference:
              null,

            paymentMethod:
              "FREE",

            gatewayStatus:
              "COMPLETED",

            status:
              "PAID",

            paymentCompletedAt:
              new Date(),
          },
        });
      },
    );

  /*
  |--------------------------------------------------------------------------
  | Issue Event Passes
  |--------------------------------------------------------------------------
  */

  const passes =
    await issuePurchase(
      purchase.id,
    );

  return {
    purchase,

    passes,

    checkoutUrl:
      null,

    paymentRequired:
      false,
  };
}
  /*
|--------------------------------------------------------------------------
| Paid Ticket
|--------------------------------------------------------------------------
|
| Create a pending purchase first.
| Inventory is NOT reserved until payment succeeds.
|
*/

const purchase =
  await prisma.ticketPurchase.create({
    data: {
      userId,

      eventId:
        ticket.eventId,

      ticketTypeId,

      quantity,

      amount,

      currency,

      paymentProvider:
        "REVOLUT",

      paymentReference:
        null,

      paymentMethod:
        null,

      gatewayStatus:
        "PENDING",

      status:
        "PENDING",
    },
  });

/*
|--------------------------------------------------------------------------
| Convert Amount
|--------------------------------------------------------------------------
*/

const revolutAmount =
  toMinorUnits(
    amount,
    currency,
  );

if (
  !Number.isInteger(
    revolutAmount,
  ) ||
  revolutAmount < 1
) {
  await prisma.ticketPurchase.delete({
    where: {
      id:
        purchase.id,
    },
  });

  throw new Error(
    "Payment amount is invalid.",
  );
}

/*
|--------------------------------------------------------------------------
| Return URL
|--------------------------------------------------------------------------
*/

const paymentReturnUrl =
  process.env
    .PAYMENT_RETURN_URL ??
  process.env.FRONTEND_URL;

/*
|--------------------------------------------------------------------------
| Create Revolut Order
|--------------------------------------------------------------------------
*/

try {
  const order =
    await createRevolutOrder({
      amount:
        revolutAmount,

      currency,

      purchaseId:
        purchase.id,

      userId,

      eventId:
        ticket.eventId,

      ticketTypeId,

      description:
        `${ticket.event.title} - ${ticket.name}`,

      redirectUrl:
  paymentReturnUrl
    ? `${paymentReturnUrl}?purchase=${encodeURIComponent(
        purchase.id,
      )}`
    : undefined,
    });

  /*
  |--------------------------------------------------------------------------
  | Validate Revolut Response
  |--------------------------------------------------------------------------
  */

  if (!order.id) {
    throw new Error(
      "Revolut did not return an order ID.",
    );
  }

  if (!order.checkout_url) {
    throw new Error(
      "Revolut did not return a checkout URL.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Store Revolut Order Reference
  |--------------------------------------------------------------------------
  */

  const updatedPurchase =
    await prisma.ticketPurchase.update({
      where: {
        id:
          purchase.id,
      },

      data: {
        paymentReference:
          order.id,
      },
    });

  /*
  |--------------------------------------------------------------------------
  | Return Checkout
  |--------------------------------------------------------------------------
  */

  return {
    purchase:
      updatedPurchase,

    passes: [],

    checkoutUrl:
      order.checkout_url,

    paymentRequired:
      true,
  };
} catch (error) {
  console.error(
    "REVOLUT PURCHASE ERROR:",
    error,
  );

  /*
  |--------------------------------------------------------------------------
  | Cleanup Pending Purchase
  |--------------------------------------------------------------------------
  */

  try {
    await prisma.ticketPurchase.delete({
      where: {
        id:
          purchase.id,
      },
    });
  } catch (cleanupError) {
    console.error(
      "PURCHASE CLEANUP ERROR:",
      cleanupError,
    );
  }

  if (
    error instanceof Error
  ) {
    throw error;
  }

  throw new Error(
    "Unable to initialize payment.",
  );
}

}

/*
|--------------------------------------------------------------------------
| My Tickets
|--------------------------------------------------------------------------
*/

export async function getMyTickets(
  userId: string,
) {
  return prisma.ticketPurchase.findMany({
    where: {
      userId,

      status: "PAID",
    },

    include: {
      event: {
        select: {
          id: true,
          title: true,
          venue: true,
          city: true,
          country: true,
          coverImage: true,
          featuredImage: true,
          startDate: true,
          endDate: true,
          currency: true,
        },
      },

      ticket: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },

      passes: {
        where: {
          isActive: true,
          isRevoked: false,
        },

        orderBy: {
          createdAt: "asc",
        },
      },

      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,

          attendeeProfile: {
            select: {
              avatar: true,
              profession: true,
              company: true,
              jobTitle: true,
            },
          },
        },
      },

      checkIn: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
|--------------------------------------------------------------------------
| Purchase Payment Status
|--------------------------------------------------------------------------
*/

export async function getPurchasePaymentStatus(
  userId: string,
  purchaseId: string,
) {
  const purchase =
    await prisma.ticketPurchase.findFirst({
      where: {
        id: purchaseId,
        userId,
      },

      select: {
        id: true,
        status: true,
        gatewayStatus: true,
        paymentProvider: true,
        paymentReference: true,
        paymentCompletedAt: true,
        amount: true,
        currency: true,
        quantity: true,

        event: {
          select: {
            id: true,
            title: true,
          },
        },

        ticket: {
          select: {
            id: true,
            name: true,
          },
        },

        passes: {
          where: {
            isActive: true,
            isRevoked: false,
          },

          select: {
            id: true,
          },
        },
      },
    });

  if (!purchase) {
    throw new Error(
      "Purchase not found.",
    );
  }

  return {
    id: purchase.id,

    status:
      purchase.status,

    gatewayStatus:
      purchase.gatewayStatus,

    paymentProvider:
      purchase.paymentProvider,

    paymentReference:
      purchase.paymentReference,

    paymentCompletedAt:
      purchase.paymentCompletedAt,

    amount:
      purchase.amount,

    currency:
      purchase.currency,

    quantity:
      purchase.quantity,

    event:
      purchase.event,

    ticket:
      purchase.ticket,

    passes:
      purchase.passes,

    hasPass:
      purchase.passes.length > 0,
  };
}

/*
|--------------------------------------------------------------------------
| My Events
|--------------------------------------------------------------------------
*/

export async function getMyEvents(
  userId: string,
) {
  return prisma.ticketPurchase.findMany({
    where: {
      userId,

      status: "PAID",
    },

    include: {
      event: {
        include: {
          announcements: {
            where: {
              OR: [
                {
                  expiresAt: null,
                },
                {
                  expiresAt: {
                    gt: new Date(),
                  },
                },
              ],
            },

            orderBy: [
              {
                isPinned: "desc",
              },
              {
                createdAt: "desc",
              },
            ],

            take: 5,
          },
        },
      },

      ticket: true,

      passes: {
        where: {
          isActive: true,
          isRevoked: false,
        },
      },

      checkIn: true,
    },

    orderBy: {
      event: {
        startDate: "asc",
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| Event Hub
|--------------------------------------------------------------------------
*/

export async function getMyEvent(
  userId: string,
  purchaseId: string,
) {
  const purchase =
    await prisma.ticketPurchase.findFirst({
      where: {
        id: purchaseId,

        userId,

        status: "PAID",
      },

      include: {
        event: {
          include: {
            announcements: {
              where: {
                OR: [
                  {
                    expiresAt: null,
                  },
                  {
                    expiresAt: {
                      gt: new Date(),
                    },
                  },
                ],
              },

              orderBy: [
                {
                  isPinned: "desc",
                },
                {
                  createdAt: "desc",
                },
              ],
            },

            sessions: {
              orderBy: {
                startTime: "asc",
              },
            },
          },
        },

        ticket: true,

        passes: {
          where: {
            isActive: true,
            isRevoked: false,
          },
        },

        checkIn: {
          include: {
            staff: true,
          },
        },

        activities: {
          orderBy: {
            createdAt: "desc",
          },
        },

        user: {
          include: {
            attendeeProfile: true,
          },
        },
      },
    });

  if (!purchase) {
    throw new Error(
      "Event not found.",
    );
  }

  return purchase;
}
          