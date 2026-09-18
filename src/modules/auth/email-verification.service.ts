import crypto from "crypto";

import { prisma } from "../../lib/prisma";

import { sendEmail } from "../email/email.service";

import {
  verificationEmailTemplate,
} from "../email/email.templates";

const VERIFICATION_EXPIRY_HOURS = 24;

function generateVerificationToken() {
  const token =
    crypto.randomBytes(32).toString("hex");

  const tokenHash =
    crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

  return {
    token,
    tokenHash,
  };
}

function getVerificationUrl(
  token: string,
) {
  const appUrl =
    process.env.WEB_APP_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";

  return `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(
  userId: string,
) {
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  if (!user) {
    throw new Error(
      "User not found",
    );
  }

  if (user.emailVerified) {
    return {
      success: true,
      alreadyVerified: true,
    };
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
  });

  const {
    token,
    tokenHash,
  } =
    generateVerificationToken();

  const expiresAt =
    new Date(
      Date.now() +
        VERIFICATION_EXPIRY_HOURS *
          60 *
          60 *
          1000,
    );

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const template =
    verificationEmailTemplate({
      firstName:
        user.firstName,

      verificationUrl:
        getVerificationUrl(token),
    });

  return sendEmail({
    type:
      "EMAIL_VERIFICATION",

    to:
      user.email,

    subject:
      template.subject,

    html:
      template.html,

    text:
      template.text,

    userId:
      user.id,

    idempotencyKey:
      `email_verification_${user.id}_${tokenHash}`,
  });
}

export async function verifyUserEmail(
  token: string,
) {
  if (!token?.trim()) {
    throw new Error(
      "Verification token is required",
    );
  }

  const tokenHash =
    crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

  const verificationToken =
    await prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },
    });

  if (!verificationToken) {
    throw new Error(
      "Invalid verification token",
    );
  }

  if (verificationToken.usedAt) {
    throw new Error(
      "Verification token has already been used",
    );
  }

  if (
    verificationToken.expiresAt <
    new Date()
  ) {
    throw new Error(
      "Verification token has expired",
    );
  }

  const user =
    await prisma.$transaction(
      async (tx) => {
        const updatedUser =
          await tx.user.update({
            where: {
              id:
                verificationToken.userId,
            },

            data: {
              emailVerified:
                true,
            },
          });

        await tx.emailVerificationToken.update({
          where: {
            id:
              verificationToken.id,
          },

          data: {
            usedAt:
              new Date(),
          },
        });

        return updatedUser;
      },
    );

  const {
    password: _password,
    ...safeUser
  } = user;

  return {
    user:
      safeUser,
  };
}