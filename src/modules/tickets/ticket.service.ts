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
  return prisma.ticketType.findMany({
    where: {
      eventId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}