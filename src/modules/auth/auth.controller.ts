import { Request, Response } from "express";

import { prisma } from "../../lib/prisma";

import { AuthRequest } from "./auth.middleware";

import {
  registerUser,
  loginUser,
} from "./auth.service";

export async function register(
  req: Request,
  res: Response
) {
  try {
    console.log(
      "REGISTER BODY:",
      req.body
    );

    const result =
      await registerUser(
        req.body
      );

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Registration failed",
    });
  }
}

export async function login(
  req: Request,
  res: Response
) {
  try {
    const {
      email,
      password,
    } = req.body;

    const result =
      await loginUser(
        email,
        password
      );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Login failed",
    });
  }
}

export async function me(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id:
            req.user.userId,
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    const {
      password: _,
      ...safeUser
    } = user;

    return res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error: any) {
    console.error(
      "ME ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Server error",
    });
  }
}