import jwt from "jsonwebtoken";

const SECRET =
  process.env.JWT_SECRET ||
  "wowyou-dev-secret";

const EXPIRES_IN = "7d";

export interface OpsTokenPayload {
  staffId: string;
  eventId: string;
  role: string;
  station?: string | null;
  permissions: string[];
}

export function generateOpsToken(
  payload: OpsTokenPayload
): string {
  return jwt.sign(
    payload,
    SECRET,
    {
      expiresIn: EXPIRES_IN,
    }
  );
}

export function verifyOpsToken(
  token: string
): OpsTokenPayload {
  return jwt.verify(
    token,
    SECRET
  ) as OpsTokenPayload;
}