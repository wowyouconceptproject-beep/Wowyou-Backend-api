import bcrypt from "bcryptjs";

import { prisma } from "../../lib/prisma";

import { generateToken } from "./jwt";

export async function registerUser(
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role:
      | "ORGANIZER"
      | "VENDOR"
      | "ATTENDEE";
  }
) {
  const existingUser =
    await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

  if (existingUser) {
    throw new Error(
      "Email already exists"
    );
  }

  const hashedPassword =
    await bcrypt.hash(
      data.password,
      10
    );

  const user =
    await prisma.user.create({
      data: {
        firstName:
          data.firstName,

        lastName:
          data.lastName,

        email:
          data.email,

        password:
          hashedPassword,

        role:
          data.role,
      },
    });

  const token =
    generateToken(
      user.id
    );

  const {
    password: _,
    ...safeUser
  } = user;

  return {
    token,
    user: safeUser,
  };
}

export async function loginUser(
  email: string,
  password: string
) {
  const user =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });

  if (!user) {
    throw new Error(
      "Invalid credentials"
    );
  }

  const isValid =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!isValid) {
    throw new Error(
      "Invalid credentials"
    );
  }

  const token =
    generateToken(
      user.id
    );

  const {
    password: _,
    ...safeUser
  } = user;

  return {
    token,
    user: safeUser,
  };
}