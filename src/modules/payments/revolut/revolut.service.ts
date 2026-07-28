import crypto from "crypto";

import {
  CreateRevolutOrderInput,
  RevolutOrder,
} from "./revolut.types";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const REVOLUT_API_URL =
  process.env.REVOLUT_API_URL ??
  "https://merchant.revolut.com/api";

const REVOLUT_API_VERSION =
  process.env.REVOLUT_API_VERSION ??
  "2026-04-20";

/*
|--------------------------------------------------------------------------
| Secret Key
|--------------------------------------------------------------------------
*/

function getSecretKey() {
  const key =
    process.env.REVOLUT_SECRET_KEY;

  if (!key) {
    throw new Error(
      "REVOLUT_SECRET_KEY is missing.",
    );
  }

  return key;
}

/*
|--------------------------------------------------------------------------
| Webhook Secret
|--------------------------------------------------------------------------
*/

function getWebhookSecret() {
  const secret =
    process.env
      .REVOLUT_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "REVOLUT_WEBHOOK_SECRET is missing.",
    );
  }

  return secret;
}

/*
|--------------------------------------------------------------------------
| Revolut Request
|--------------------------------------------------------------------------
*/

async function revolutRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response =
    await fetch(
      `${REVOLUT_API_URL}${path}`,
      {
        ...options,

        headers: {
          Authorization:
            `Bearer ${getSecretKey()}`,

          "Content-Type":
            "application/json",

          "Revolut-Api-Version":
            REVOLUT_API_VERSION,

          ...(options.headers ??
            {}),
        },
      },
    );

  const raw =
    await response.text();

  let data: any = {};

  if (raw) {
    try {
      data =
        JSON.parse(raw);
    } catch {
      data = {
        message: raw,
      };
    }
  }

  if (!response.ok) {
    console.error(
      "REVOLUT API ERROR:",
      {
        path,
        status:
          response.status,
        data,
      },
    );

    throw new Error(
      data?.message ??
        data?.error ??
        `Revolut returned HTTP ${response.status}.`,
    );
  }

  return data as T;
}

/*
|--------------------------------------------------------------------------
| Create Order
|--------------------------------------------------------------------------
*/

export async function createRevolutOrder(
  input: CreateRevolutOrderInput,
) {
  if (
    !Number.isInteger(
      input.amount,
    ) ||
    input.amount < 1
  ) {
    throw new Error(
      "Invalid Revolut order amount.",
    );
  }

  const body: Record<
    string,
    unknown
  > = {
    amount:
      input.amount,

    currency:
      input.currency.toUpperCase(),

    description:
      input.description,

    merchant_order_data: {
      reference:
        input.purchaseId,
    },

    metadata: {
      purchaseId:
        input.purchaseId,

      userId:
        input.userId,

      eventId:
        input.eventId,

      ticketTypeId:
        input.ticketTypeId,
    },
  };

  if (input.redirectUrl) {
    body.redirect_url =
      input.redirectUrl;
  }

  return revolutRequest<
    RevolutOrder
  >(
    "/orders",
    {
      method: "POST",

      headers: {
        "Idempotency-Key":
          input.purchaseId,
      },

      body:
        JSON.stringify(
          body,
        ),
    },
  );
}

/*
|--------------------------------------------------------------------------
| Get Order
|--------------------------------------------------------------------------
*/

export async function getRevolutOrder(
  orderId: string,
) {
  if (!orderId) {
    throw new Error(
      "Revolut order ID is required.",
    );
  }

  return revolutRequest<
    RevolutOrder
  >(
    `/orders/${encodeURIComponent(
      orderId,
    )}`,
  );
}

/*
|--------------------------------------------------------------------------
| Verify Webhook
|--------------------------------------------------------------------------
|
| Revolut signs:
|
| v1.TIMESTAMP.RAW_BODY
|
*/

export function verifyRevolutWebhook(
  rawBody: string,
  timestamp: string,
  signatureHeader: string,
) {
  if (
    !rawBody ||
    !timestamp ||
    !signatureHeader
  ) {
    return false;
  }

  /*
  |--------------------------------------------------------------------------
  | Replay Protection
  |--------------------------------------------------------------------------
  |
  | Revolut recommends a five-minute tolerance.
  |
  */

  const timestampNumber =
    Number(timestamp);

  if (
    !Number.isFinite(
      timestampNumber,
    )
  ) {
    return false;
  }

  const now =
    Date.now();

  const difference =
    Math.abs(
      now -
        timestampNumber,
    );

  const fiveMinutes =
    5 * 60 * 1000;

  if (
    difference >
    fiveMinutes
  ) {
    return false;
  }

  /*
  |--------------------------------------------------------------------------
  | Build Signed Payload
  |--------------------------------------------------------------------------
  */

  const payload =
    `v1.${timestamp}.${rawBody}`;

  const digest =
    crypto
      .createHmac(
        "sha256",
        getWebhookSecret(),
      )
      .update(payload)
      .digest("hex");

  const expected =
    `v1=${digest}`;

  /*
  |--------------------------------------------------------------------------
  | Revolut Can Send Multiple Signatures
  |--------------------------------------------------------------------------
  */

  const signatures =
    signatureHeader
      .split(",")
      .map(
        (value) =>
          value.trim(),
      );

  return signatures.some(
    (signature) => {
      try {
        const actualBuffer =
          Buffer.from(
            signature,
          );

        const expectedBuffer =
          Buffer.from(
            expected,
          );

        if (
          actualBuffer.length !==
          expectedBuffer.length
        ) {
          return false;
        }

        return crypto.timingSafeEqual(
          actualBuffer,
          expectedBuffer,
        );
      } catch {
        return false;
      }
    },
  );
}