import Stripe from "stripe";

import { prisma } from "../../lib/prisma";

function getStripe() {
  const key =
    process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is missing",
    );
  }

  return new Stripe(key);
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
  if (quantity < 1) {
    throw new Error(
      "Quantity must be at least 1",
    );
  }

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
      "Ticket not found",
    );
  }

  if (!ticket.isActive) {
    throw new Error(
      "Ticket unavailable",
    );
  }

  const amount =
    ticket.price * quantity;

  const purchase =
    await prisma.ticketPurchase.create({
      data: {
        userId,
        eventId:
          ticket.eventId,
        ticketTypeId,
        quantity,
        amount,
        status: "PENDING",
      },
    });

  const stripe =
    getStripe();

  const session =
    await stripe.checkout.sessions.create({
      mode: "payment",

      success_url:
        `${process.env.FRONTEND_URL}/tickets/success?purchase=${purchase.id}`,

      cancel_url:
        `${process.env.FRONTEND_URL}/tickets/cancel?purchase=${purchase.id}`,

      metadata: {
        purchaseId:
          purchase.id,
        userId,
        eventId:
          ticket.eventId,
        ticketTypeId,
      },

      line_items: [
        {
          quantity,

          price_data: {
            currency:
              ticket.event.currency.toLowerCase(),

            product_data: {
              name:
                ticket.name,

              description:
                ticket.event.title,
            },

            unit_amount:
              Math.round(
                ticket.price * 100,
              ),
          },
        },
      ],
    });

  await prisma.ticketPurchase.update({
    where: {
      id: purchase.id,
    },

    data: {
      stripeSessionId:
        session.id,
    },
  });

  return {
    purchase,

    checkoutUrl:
      session.url,
  };
}

/*
|--------------------------------------------------------------------------
| Legacy My Tickets
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
      createdAt: "desc",
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
      status: "PAID",
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
                  isPinned: "desc",
                },
                {
                  createdAt: "desc",
                },
              ],

              take: 20,
            },

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
                        firstName: true,
                        lastName: true,
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
                createdAt: "desc",
              },

              take: 30,
            },
          },
        },

        ticket: true,

        user: {
          select: {
            id: true,

            firstName: true,

            lastName: true,

            email: true,

            attendeeProfile: {
              select: {
                profession: true,
                industry: true,
                company: true,
                jobTitle: true,
                avatar: true,
                bio: true,
                linkedin: true,
                goals: true,
                skills: true,
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