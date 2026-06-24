import { prisma } from "../../lib/prisma";

export async function createTicket(
  eventId: string,
  data: {
    name: string;
    price: number;
    quantity: number;
  }
) {
  return prisma.ticketType.create({
    data: {
      eventId,
      name: data.name,
      price: Number(
        data.price
      ),
      quantity: Number(
        data.quantity
      ),
    },
  });
}

export async function getTickets(
  eventId: string
) {
  const event =
    await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      include: {
        tickets: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

  if (!event) {
    throw new Error(
      "Event not found"
    );
  }

  return {
    currency:
      event.currency,
    tickets:
      event.tickets,
  };
}