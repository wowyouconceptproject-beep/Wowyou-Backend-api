import jwt from "jsonwebtoken";

export interface SocketUser {
  userId: string;
  email: string;
  role: string;
}

export function verifySocketToken(
  token?: string
): SocketUser | null {
  if (!token) return null;

  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as SocketUser;
  } catch {
    return null;
  }
}