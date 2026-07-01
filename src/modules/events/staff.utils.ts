import { prisma } from "../../lib/prisma";

function randomChunk(length = 4) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];
  }

  return result;
}

export async function generateAccessCode(): Promise<string> {
  while (true) {
    const code = `OPS-${randomChunk()}-${randomChunk()}`;

    const exists =
      await prisma.eventStaff.findUnique({
        where: {
          accessCode: code,
        },
      });

    if (!exists) {
      return code;
    }
  }
}