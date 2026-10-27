
import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";

const JWT_SECRET: Secret = (() => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
})();

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(
  token: string,
): JwtPayload & { userId: string } {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    !decoded.userId
  ) {
    throw new Error("Invalid authentication token.");
  }

  return decoded as unknown as JwtPayload & {
    userId: string;
  };
}
