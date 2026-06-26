import jwt from "jsonwebtoken";

const SECRET =
  process.env.PASS_JWT_SECRET!;

const EXPIRES_IN = "60s";

export function generatePassToken(data: {
  purchaseId: string;
  eventId: string;
  userId: string;
}) {
  return jwt.sign(data, SECRET, {
    expiresIn: EXPIRES_IN,
  });
}

export function verifyPassToken(
  token: string
) {
  return jwt.verify(
    token,
    SECRET
  );
}