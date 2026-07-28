import { prisma } from "../../lib/prisma";

import {
  createRevolutOrder,
} from "../payments/revolut/revolut.service";

/*
|--------------------------------------------------------------------------
| Currency Minor Units
|--------------------------------------------------------------------------
*/

function toMinorUnits(
  amount: number,
  currency: string,
) {
  const normalizedCurrency =
    currency.trim().toUpperCase();

  const zeroDecimalCurrencies =
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
    zeroDecimalCurrencies.has(
      normalizedCurrency,
    )
  ) {
    return Math.round(amount);
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
  | Validate Input
  |--------------------------------------------------------------------------
  */

  if (!userId) {
    throw new Error(
      "User ID is required.",
    );
  }

  if (!ticketTypeId) {
    throw new Error(
      "Ticket type ID is required.",
    );
  }

  if (
    !Number.isInteger(quantity) ||
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
  | Ticket Availability
  |--------------------------------------------------------------------------
  */

  if (!ticket.isActive) {
    throw new Error(
      "Ticket unavailable.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Event Availability
  |--------------------------------------------------------------------------
  */

  if (
    ticket.event.status !==
    "PUBLISHED"
  ) {
    throw new Error(
      "This event is not currently available.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Prevent Purchase For Ended Events
  |--------------------------------------------------------------------------
  */

  const now = new Date();

  if (
    ticket.event.endDate &&
    new Date(
      ticket.event.endDate,
    ) <= now
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

  const remainingTickets =
    ticket.quantity -
    ticket.sold;

  if (remainingTickets <= 0) {
    throw new Error(
      "This ticket is sold out.",
    );
  }

  if (
    quantity >
    remainingTickets
  ) {
    throw new Error(
      `Only ${remainingTickets} ticket${
        remainingTickets === 1
          ? ""
          : "s"
      } remaining.`,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Currency
  |--------------------------------------------------------------------------
  */

  const currency =
    ticket.event.currency
      ?.trim()
      .toUpperCase();

  if (!currency) {
    throw new Error(
      "Event currency is missing.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Calculate Amount
  |--------------------------------------------------------------------------
  */

  const unitPrice =
    Number(ticket.price);

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
    !Number.isFinite(amount) ||
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
  |
  | Free tickets do not need Revolut.
  |
  | Inventory and purchase creation happen inside one transaction.
  |
  */

  if (amount === 0) {
    const purchase =
      await prisma.$transaction(
        async (tx) => {
          /*
          |--------------------------------------------------------------------------
          | Reload Ticket Inside Transaction
          |--------------------------------------------------------------------------
          */

          const currentTicket =
            await tx.ticketType.findUnique({
              where: {
                id:
                  ticketTypeId,
              },
            });

          if (!currentTicket) {
            throw new Error(
              "Ticket not found.",
            );
          }

          if (
            !currentTicket.isActive
          ) {
            throw new Error(
              "Ticket unavailable.",
            );
          }

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
          | Atomic Inventory Claim
          |--------------------------------------------------------------------------
          */

          const inventoryUpdate =
            await tx.ticketType.updateMany({
              where: {
                id:
                  ticketTypeId,

                isActive:
                  true,

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
            inventoryUpdate.count !==
            1
          ) {
            throw new Error(
              "This ticket is sold out or there are not enough tickets remaining.",
            );
          }

          /*
          |--------------------------------------------------------------------------
          | Create Free Purchase
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
                null,

              paymentReference:
                null,

              paymentMethod:
                "FREE",

              status:
                "PAID",
            },
          });
        },
      );

    return {
      purchase,

      checkoutUrl:
        null,

      paymentRequired:
        false,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Paid Purchase
  |--------------------------------------------------------------------------
  |
  | Do NOT increment sold here.
  |
  | Payment has not happened yet.
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

        status:
          "PENDING",
      },
    });

  /*
  |--------------------------------------------------------------------------
  | Revolut Amount
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
            ? `${paymentReturnUrl}/tickets/payment-return?purchase=${encodeURIComponent(
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
    | Clean Up Pending Purchase
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

      status:
        "PAID",
    },

    include: {
      event: {
        select: {
          id: true,

          title: true,

          venue: true,

          startDate: true,

          endDate: true,

          coverImage: true,

          featuredImage: true,

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
    },

    orderBy: {
      createdAt:
        "desc",
    },
  });
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

      status:
        "PAID",
    },

    include: {
      event: {
        select: {
          id: true,

          title: true,

          description: true,

          venue: true,

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
    },

    orderBy: {
      event: {
        startDate:
          "asc",
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
  if (!purchaseId) {
    throw new Error(
      "Purchase ID is required.",
    );
  }

  const purchase =
    await prisma.ticketPurchase.findFirst({
      where: {
        id:
          purchaseId,

        userId,

        status:
          "PAID",
      },

      include: {
        event: {
          include: {
            /*
            |--------------------------------------------------------------------------
            | Announcements
            |--------------------------------------------------------------------------
            */

            announcements: {
              where: {
                OR: [
                  {
                    expiresAt:
                      null,
                  },

                  {
                    expiresAt: {
                      gt:
                        new Date(),
                    },
                  },
                ],
              },

              include: {
                author: {
                  select: {
                    id: true,

                    name: true,

                    role: true,
                  },
                },
              },

              orderBy: [
                {
                  isPinned:
                    "desc",
                },

                {
                  createdAt:
                    "desc",
                },
              ],

              take: 20,
            },

            /*
            |--------------------------------------------------------------------------
            | Event Activity
            |--------------------------------------------------------------------------
            */

            activities: {
              include: {
                actor: {
                  select: {
                    id: true,

                    name: true,

                    role: true,
                  },
                },

                attendee: {
                  include: {
                    user: {
                      select: {
                        firstName:
                          true,

                        lastName:
                          true,
                      },
                    },
                  },
                },

                ticketType: {
                  select: {
                    id: true,

                    name: true,
                  },
                },

                purchase: {
                  select: {
                    id: true,
                  },
                },
              },

              orderBy: {
                createdAt:
                  "desc",
              },

              take: 30,
            },
          },
        },

        ticket:
          true,

        user: {
          select: {
            id: true,

            firstName:
              true,

            lastName:
              true,

            email:
              true,

            attendeeProfile: {
              select: {
                profession:
                  true,

                industry:
                  true,

                company:
                  true,

                jobTitle:
                  true,

                avatar:
                  true,

                bio:
                  true,

                linkedin:
                  true,

                goals:
                  true,

                skills:
                  true,
              },
            },
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