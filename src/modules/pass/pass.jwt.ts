import jwt, { JwtPayload } from "jsonwebtoken";

function getPassJwtSecret(): string {
  const secret = process.env.PASS_JWT_SECRET;

  if (!secret) {
    throw new Error("PASS_JWT_SECRET is not configured.");
  }

  return secret;
}

export interface PassTokenPayload {
  purchaseId: string;
  passId: string;
  passNumber: string;
  qrToken: string;
  nfcToken: string;
  eventId: string;
  userId: string;
}

export interface RotatingQrPayload {
  tokenType: "ROTATING_QR";
  purchaseId: string;
  passId: string;
  passNumber: string;
  eventId: string;
  userId: string;
}

export function generatePassToken(
  data: PassTokenPayload,
): string {
  return jwt.sign(data, getPassJwtSecret());
}

/**
 * Legacy pass-token verification.
 * Do not use this function to authorize QR entry.
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

/**
 * Creates a QR-entry credential that expires after 60 seconds.
 * It is deliberately separate from the permanent pass JWT.
 */
export function generateRotatingQrToken(
  data: RotatingQrPayload,
): string {
  return jwt.sign(
    {
      ...data,
      tokenType: "ROTATING_QR",
    },
    getPassJwtSecret(),
    {
      expiresIn: 60,
    },
  );
}

/**
 * Only a correctly signed, unexpired rotating QR token is accepted.
 */
export function verifyRotatingQrToken(
  token: string,
): RotatingQrPayload {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("Rotating QR token is required.");
  }

  let decoded: string | JwtPayload;

  try {
    decoded = jwt.verify(
      token.trim(),
      getPassJwtSecret(),
    );
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError
    ) {
      throw new Error("QR code has expired. Refresh the ticket QR code.");
    }

    throw new Error("Invalid or expired QR code.");
  }

  if (
    typeof decoded === "string" ||
    !decoded ||
    typeof decoded !== "object"
  ) {
    throw new Error("Invalid QR token payload.");
  }

  const payload = decoded as JwtPayload &
    Record<string, unknown>;

  if (
    payload.tokenType !== "ROTATING_QR" ||
    typeof payload.purchaseId !== "string" ||
    typeof payload.passId !== "string" ||
    typeof payload.passNumber !== "string" ||
    typeof payload.eventId !== "string" ||
    typeof payload.userId !== "string"
  ) {
    throw new Error("Invalid rotating QR token.");
  }

  return {
    tokenType: "ROTATING_QR",
    purchaseId: payload.purchaseId,
    passId: payload.passId,
    passNumber: payload.passNumber,
    eventId: payload.eventId,
    userId: payload.userId,
  };
}
