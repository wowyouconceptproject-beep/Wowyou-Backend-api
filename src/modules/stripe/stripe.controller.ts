import Stripe from "stripe";

import { prisma } from "../../lib/prisma";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

export async function webhook(
  req: any,
  res: any
) {
  const signature =
    req.headers[
      "stripe-signature"
    ];

  try {
    const event =
      stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env
          .STRIPE_WEBHOOK_SECRET!
      );

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object as Stripe.Checkout.Session;

      const purchaseId =
        session.metadata
          ?.purchaseId;

      if (purchaseId) {
        const purchase =
          await prisma.ticketPurchase.update({
            where: {
              id: purchaseId,
            },
            data: {
              status: "PAID",
            },
          });

        await prisma.ticketType.update({
          where: {
            id: purchase.ticketTypeId,
          },
          data: {
            sold: {
              increment:
                purchase.quantity,
            },
          },
        });
      }
    }

    return res.json({
      received: true,
    });
  } catch (error) {
    console.error(
      error
    );

    return res.status(400).send(
      "Webhook Error"
    );
  }
}