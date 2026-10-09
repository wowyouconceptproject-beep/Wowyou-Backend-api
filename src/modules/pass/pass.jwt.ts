import jwt from "jsonwebtoken";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

function getPassJwtSecret(): string {
  const secret =
    process.env.PASS_JWT_SECRET;

  if (!secret) {
    throw new Error(
      "PASS_JWT_SECRET is not configured.",
    );
  }

  return secret;
}

const PASS_JWT_SECRET =
  getPassJwtSecret();

const EXPIRES_IN =
  "60s" as const;

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
*/

export function generatePassToken(
  data: PassTokenPayload,
): string {
  return jwt.sign(
    data,
    PASS_JWT_SECRET,
    {
      expiresIn:
        EXPIRES_IN,
    },
  );
}

/*
|--------------------------------------------------------------------------
| Verify Pass Token
|--------------------------------------------------------------------------
*/

export function verifyPassToken(
  token: string,
): PassTokenPayload {
  const decoded =
    jwt.verify(
      token,
      PASS_JWT_SECRET,
    );

  /*
  |--------------------------------------------------------------------------
  | Payload Must Be An Object
  |--------------------------------------------------------------------------
  */

  if (
    typeof decoded ===
    "string"
  ) {
    throw new Error(
      "Invalid pass token payload.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Required Claims
  |--------------------------------------------------------------------------
  */

  if (
    typeof decoded.purchaseId !==
    "string" ||

    typeof decoded.passId !==
    "string" ||

    typeof decoded.passNumber !==
    "string" ||

    typeof decoded.qrToken !==
    "string" ||

    typeof decoded.nfcToken !==
    "string" ||

    typeof decoded.eventId !==
    "string" ||

    typeof decoded.userId !==
    "string"
  ) {
    throw new Error(
      "Invalid pass token payload.",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Return Typed Payload
  |--------------------------------------------------------------------------
  */

  return {
    purchaseId:
      decoded.purchaseId,

    passId:
      decoded.passId,

    passNumber:
      decoded.passNumber,

    qrToken:
      decoded.qrToken,

    nfcToken:
      decoded.nfcToken,

    eventId:
      decoded.eventId,

    userId:
      decoded.userId,
  };
}