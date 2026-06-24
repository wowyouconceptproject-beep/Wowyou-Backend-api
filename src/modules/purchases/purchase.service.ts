import Stripe from "stripe";

import { prisma } from "../../lib/prisma";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

export async function createPurchase(
userId: string,
ticketTypeId: string,
quantity: number
) {
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
"Ticket not found"
);
}

if (!ticket.isActive) {
throw new Error(
"Ticket unavailable"
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
          "usd",

        product_data: {
          name:
            ticket.name,

          description:
            ticket.event.title,
        },

        unit_amount:
          Math.round(
            ticket.price * 100
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
