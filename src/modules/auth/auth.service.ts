import bcrypt from "bcryptjs";

import {
  UserRole,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

import { generateToken } from "./jwt";

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
  };
}

/*
|--------------------------------------------------------------------------
| Login User
|--------------------------------------------------------------------------
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
  | Generate JWT
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
  | Response
  |--------------------------------------------------------------------------
  */

  return {
    token,

    user: safeUser,
  };
}