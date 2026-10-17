
import jwt, { JwtPayload } from "jsonwebtoken";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

function getPassJwtSecret(): string {
  const secret = process.env.PASS_JWT_SECRET;

  if (!secret) {
    throw new Error("PASS_JWT_SECRET is not configured.");
  }

  return secret;
}

/*
|--------------------------------------------------------------------------
| Pass Payload
|--------------------------------------------------------------------------
*/

export interface PassTokenPayload {
  purchaseId: string;
  passId: string;
  passNumber: string;
  qrToken: string;
  nfcToken: string;
  eventId: string;
  userId: string;
}

/*
|--------------------------------------------------------------------------
| Generate Pass Token
|--------------------------------------------------------------------------
|
| Pass JWTs do not expire after 60 seconds.
| The database remains authoritative for pass validity.
|
*/

export function generatePassToken(
  data: PassTokenPayload,
): string {
  return jwt.sign(data, getPassJwtSecret());
}

/*
|--------------------------------------------------------------------------
| Verify Pass Token
|--------------------------------------------------------------------------
*/

export function verifyPassToken(
  token: string,
): PassTokenPayload {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("Pass token is required.");
  }

  const decoded = jwt.verify(
    token.trim(),
    getPassJwtSecret(),
  );

  if (
    typeof decoded === "string" ||
    !decoded ||
    typeof decoded !== "object"
  ) {
    throw new Error("Invalid pass token payload.");
  }

  const payload = decoded as JwtPayload &
    Record<string, unknown>;

  if (
    typeof payload.purchaseId !== "string" ||
    typeof payload.passId !== "string" ||
    typeof payload.passNumber !== "string" ||
    typeof payload.qrToken !== "string" ||
    typeof payload.nfcToken !== "string" ||
    typeof payload.eventId !== "string" ||
    typeof payload.userId !== "string"
  ) {
    throw new Error("Invalid pass token payload.");
  }

  return {
    purchaseId: payload.purchaseId,
    passId: payload.passId,
    passNumber: payload.passNumber,
    qrToken: payload.qrToken,
    nfcToken: payload.nfcToken,
    eventId: payload.eventId,
    userId: payload.userId,
  };
}
