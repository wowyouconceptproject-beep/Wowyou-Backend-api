import bcrypt from "bcryptjs";

import {
  UserRole,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

import {
  generateToken,
} from "./jwt";

import {
  createLoginOtp,
  verifyLoginOtp,
} from "./login-otp.service";

/*
|--------------------------------------------------------------------------
| Public Registration Roles
|--------------------------------------------------------------------------
|
| ADMIN must NEVER be accepted from public registration.
|
*/

type RegistrationRole =
  | "ORGANIZER"
  | "VENDOR"
  | "ATTENDEE";

/*
|--------------------------------------------------------------------------
| Normalize Registration Role
|--------------------------------------------------------------------------
*/

function normalizeRegistrationRole(
  role: unknown,
): RegistrationRole {
  const normalizedRole =
    String(role ?? "")
      .trim()
      .toUpperCase();

  if (
    normalizedRole === "ORGANIZER" ||
    normalizedRole === "VENDOR" ||
    normalizedRole === "ATTENDEE"
  ) {
    return normalizedRole;
  }

  throw new Error(
    "Invalid registration role",
  );
}

/*
|--------------------------------------------------------------------------
| Register User
|--------------------------------------------------------------------------
*/

export async function registerUser(
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
  },
) {
  const firstName =
    data.firstName?.trim();

  const lastName =
    data.lastName?.trim();

  const email =
    data.email
      ?.trim()
      .toLowerCase();

  const password =
    data.password;

  /*
  |--------------------------------------------------------------------------
  | Basic Validation
  |--------------------------------------------------------------------------
  */

  if (
    !firstName ||
    !lastName ||
    !email ||
    !password
  ) {
    throw new Error(
      "First name, last name, email and password are required",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Normalize Role
  |--------------------------------------------------------------------------
  */

  const registrationRole =
    normalizeRegistrationRole(
      data.role,
    );

  /*
  |--------------------------------------------------------------------------
  | Check Existing User
  |--------------------------------------------------------------------------
  */

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });

  if (existingUser) {
    throw new Error(
      "Email already exists",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Hash Password
  |--------------------------------------------------------------------------
  */

  const hashedPassword =
    await bcrypt.hash(
      password,
      10,
    );

  /*
  |--------------------------------------------------------------------------
  | Create User
  |--------------------------------------------------------------------------
  */

  const user =
    await prisma.user.create({
      data: {
        firstName,

        lastName,

        email,

        password:
          hashedPassword,

        role:
          registrationRole as UserRole,
      },
    });

  /*
  |--------------------------------------------------------------------------
  | Generate JWT
  |--------------------------------------------------------------------------
  |
  | Registration still returns a token for compatibility with the existing
  | onboarding flow. Login remains blocked until email verification.
  |
  */

  const token =
    generateToken(
      user.id,
    );

  /*
  |--------------------------------------------------------------------------
  | Remove Password
  |--------------------------------------------------------------------------
  */

  const {
    password: _password,
    ...safeUser
  } = user;

  /*
  |--------------------------------------------------------------------------
  | Response
  |--------------------------------------------------------------------------
  */

  return {
    token,

    user: safeUser,

    requiresEmailVerification:
      !user.emailVerified,
  };
}

/*
|--------------------------------------------------------------------------
| Login User
|--------------------------------------------------------------------------
|
| Authentication flow:
|
| 1. Verify email + password.
| 2. Confirm the account email has been verified.
| 3. Send a 6-digit OTP.
| 4. Client submits the OTP to /auth/verify-login-otp.
| 5. JWT is issued only after successful OTP verification.
|
*/

export async function loginUser(
  email: string,
  password: string,
) {
  const normalizedEmail =
    email
      ?.trim()
      .toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | Validate Email
  |--------------------------------------------------------------------------
  */

  if (!normalizedEmail) {
    throw new Error(
      "Email is required",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Find User
  |--------------------------------------------------------------------------
  */

  const user =
    await prisma.user.findUnique({
      where: {
        email:
          normalizedEmail,
      },
    });

  if (!user) {
    throw new Error(
      "Invalid credentials",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Password
  |--------------------------------------------------------------------------
  */

  const isValid =
    await bcrypt.compare(
      password,
      user.password,
    );

  if (!isValid) {
    throw new Error(
      "Invalid credentials",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Verify Email
  |--------------------------------------------------------------------------
  |
  | Email verification and login OTP are intentionally separate.
  |
  | Unverified account:
  |   Password -> blocked -> verify email first
  |
  | Verified account:
  |   Password -> login OTP -> JWT
  |
  */

  if (!user.emailVerified) {
    throw new Error(
      "Please verify your email address before logging in",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Generate Login OTP
  |--------------------------------------------------------------------------
  */

  await createLoginOtp(
    user.id,
  );

  /*
  |--------------------------------------------------------------------------
  | Do NOT issue JWT yet
  |--------------------------------------------------------------------------
  */

  return {
    requiresOtp: true,

    email:
      user.email,

    message:
      "A verification code has been sent to your email.",
  };
}

/*
|--------------------------------------------------------------------------
| Complete Login
|--------------------------------------------------------------------------
|
| Final authentication step.
|
| Password has already been verified by loginUser().
| The OTP proves control of the verified email address.
|
*/

export async function completeLogin(
  email: string,
  otp: string,
) {
  const normalizedEmail =
    email
      ?.trim()
      .toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | Validate Email
  |--------------------------------------------------------------------------
  */

  if (!normalizedEmail) {
    throw new Error(
      "Email is required",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Verify OTP
  |--------------------------------------------------------------------------
  */

  const user =
    await verifyLoginOtp(
      normalizedEmail,
      otp,
    );

  /*
  |--------------------------------------------------------------------------
  | Final JWT
  |--------------------------------------------------------------------------
  */

  const token =
    generateToken(
      user.id,
    );

  /*
  |--------------------------------------------------------------------------
  | Remove Password
  |--------------------------------------------------------------------------
  */

  const {
    password: _password,
    ...safeUser
  } = user;

  /*
  |--------------------------------------------------------------------------
  | Authenticated Response
  |--------------------------------------------------------------------------
  */

  return {
    token,

    user: safeUser,
  };
}