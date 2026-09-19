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
  | We retain the existing registration behavior so we do not break the
  | current organizer/attendee onboarding flow.
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
| Step 1:
|   Verify email + password.
|
| Step 2:
|   Send a 6-digit OTP.
|
| Step 3:
|   Client submits OTP to /auth/verify-login-otp.
|
| JWT is NOT issued until the OTP is successfully verified.
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
| Step 2 of authentication.
|
| Password has already been verified by loginUser().
| The OTP now proves control of the verified email address.
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