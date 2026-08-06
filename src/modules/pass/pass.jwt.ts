import jwt from "jsonwebtoken";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const SECRET =
  process.env.PASS_JWT_SECRET!;

const EXPIRES_IN = "60s";

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
) {
  return jwt.sign(
    data,
    SECRET,
    {
      expiresIn: EXPIRES_IN,
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
  return jwt.verify(
    token,
    SECRET,
  ) as PassTokenPayload;
}