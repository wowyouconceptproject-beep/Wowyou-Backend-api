import { prisma } from "../../lib/prisma";

export async function getEventRevenue(
  eventId: string
) {
  const purchases =
    await prisma.ticketPurchase.findMany({
      where: {
        eventId,
        status: "PAID",
      },
      include: {
        ticket: true,
      },
    });

  let totalRevenue = 0;

  let ticketsSold = 0;

  const breakdown: Record<
    string,
    {
      name: string;
      sold: number;
      revenue: number;
    }
  > = {};

  for (const purchase of purchases) {
    totalRevenue += purchase.amount;

    ticketsSold += purchase.quantity;

    const ticketName =
      purchase.ticket.name;

    if (
      !breakdown[
        ticketName
      ]
    ) {
      breakdown[
        ticketName
      ] = {
        name: ticketName,
        sold: 0,
        revenue: 0,
      };
    }

    breakdown[
      ticketName
    ].sold +=
      purchase.quantity;

    breakdown[
      ticketName
    ].revenue +=
      purchase.amount;
  }

  return {
    totalRevenue,
    ticketsSold,
    breakdown:
      Object.values(
        breakdown
      ),
  };
}