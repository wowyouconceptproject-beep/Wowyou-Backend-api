import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  getMessaging,
  type MulticastMessage,
} from "firebase-admin/messaging";

import { readFileSync } from "node:fs";

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(
      readFileSync(serviceAccountPath, "utf8"),
    );

    initializeApp({
      credential: cert(serviceAccount),
    });

    return;
  }

  // Supports Application Default Credentials in environments
  // where Firebase credentials have been configured securely.
  initializeApp({
    credential: applicationDefault(),
  });
}

export interface PushNotificationInput {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushNotificationResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

export async function sendPushNotification(
  input: PushNotificationInput,
): Promise<PushNotificationResult> {
  const tokens = [
    ...new Set(
      input.tokens
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  ];

  if (tokens.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
    };
  }

  initializeFirebaseAdmin();

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];

  // FCM multicast requests support up to 500 tokens each.
  for (let index = 0; index < tokens.length; index += 500) {
    const batch = tokens.slice(index, index + 500);

    const message: MulticastMessage = {
      tokens: batch,
      notification: {
        title: input.title,
        body: input.body,
      },
      data: input.data,
    };

    const response = await getMessaging().sendEachForMulticast(
      message,
    );

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((result, resultIndex) => {
      if (result.success) {
        return;
      }

      const errorCode = result.error?.code;

      if (
        errorCode === "messaging/invalid-registration-token" ||
        errorCode === "messaging/registration-token-not-registered"
      ) {
        invalidTokens.push(batch[resultIndex]);
      }

      console.error("FCM delivery failed:", {
        code: errorCode,
        message: result.error?.message,
      });
    });
  }

  return {
    successCount,
    failureCount,
    invalidTokens,
  };
}