import { Request, Response } from "express";

import { prisma } from "../../lib/prisma";

import { AuthRequest } from "./auth.middleware";

import {
  registerUser,
  loginUser,
  completeLogin,
} from "./auth.service";

import {
  sendVerificationEmail,
  verifyUserEmail,
} from "./email-verification.service";

import {
  resendLoginOtp,
} from "./login-otp.service";

/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
*/

export async function register(
  req: Request,
  res: Response,
) {
  try {
    console.log(
      "REGISTER BODY:",
      JSON.stringify(req.body, null, 2),
    );

    console.log(
      "DATABASE_URL EXISTS:",
      !!process.env.DATABASE_URL,
    );

    console.log(
      "JWT_SECRET EXISTS:",
      !!process.env.JWT_SECRET,
    );

    const result =
      await registerUser(
        req.body,
      );

    console.log(
      "REGISTER SUCCESS:",
      result.user?.email,
    );

    /*
    |--------------------------------------------------------------------------
    | Send Verification Email
    |--------------------------------------------------------------------------
    */

    try {
      await sendVerificationEmail(
        result.user.id,
      );
    } catch (emailError) {
      console.error(
        "VERIFICATION EMAIL ERROR:",
        emailError,
      );
    }

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error(
      "REGISTER ERROR:",
    );

    console.error(error);

    return res.status(400).json({
      success: false,

      message:
        error?.message ||
        "Registration failed",

      stack:
        process.env.NODE_ENV !==
        "production"
          ? error?.stack
          : undefined,
    });
  }
}

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

export async function login(
  req: Request,
  res: Response,
) {
  try {
    console.log(
      "LOGIN ATTEMPT:",
      req.body?.email,
    );

    const {
      email,
      password,
    } = req.body;

    const result =
      await loginUser(
        email,
        password,
      );

    console.log(
      "LOGIN OTP REQUESTED:",
      email,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error(
      "LOGIN ERROR:",
    );

    console.error(error);

    return res.status(400).json({
      success: false,

      message:
        error?.message ||
        "Login failed",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Verify Login OTP
|--------------------------------------------------------------------------
*/

export async function verifyLoginCode(
  req: Request,
  res: Response,
) {
  try {
    const email =
      String(
        req.body?.email ?? "",
      )
        .trim()
        .toLowerCase();

    const otp =
      String(
        req.body?.otp ?? "",
      ).trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and verification code are required",
      });
    }

    const result =
      await completeLogin(
        email,
        otp,
      );

    console.log(
      "LOGIN OTP VERIFIED:",
      email,
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error(
      "VERIFY LOGIN OTP ERROR:",
    );

    console.error(error);

    return res.status(400).json({
      success: false,

      message:
        error?.message ||
        "Verification failed",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Resend Login OTP
|--------------------------------------------------------------------------
*/

export async function resendLoginCode(
  req: Request,
  res: Response,
) {
  try {
    const email =
      String(
        req.body?.email ?? "",
      )
        .trim()
        .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required",
      });
    }

    await resendLoginOtp(
      email,
    );

    console.log(
      "LOGIN OTP RESENT:",
      email,
    );

    return res.status(200).json({
      success: true,
      message:
        "Login code sent",
    });
  } catch (error: any) {
    console.error(
      "RESEND LOGIN OTP ERROR:",
    );

    console.error(error);

    return res.status(400).json({
      success: false,

      message:
        error?.message ||
        "Failed to resend login code",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Verify Email
|--------------------------------------------------------------------------
*/

export async function verifyEmail(
  req: Request,
  res: Response,
) {
  try {
    const token =
      String(
        req.query.token ?? "",
      ).trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "Verification token is required",
      });
    }

    const result =
      await verifyUserEmail(
        token,
      );

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully",
      ...result,
    });
  } catch (error: any) {
    console.error(
      "VERIFY EMAIL ERROR:",
    );

    console.error(error);

    return res.status(400).json({
      success: false,

      message:
        error?.message ||
        "Email verification failed",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Resend Verification Email
|--------------------------------------------------------------------------
*/

export async function resendVerification(
  req: Request,
  res: Response,
) {
  try {
    const email =
      String(
        req.body?.email ?? "",
      )
        .trim()
        .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Email is already verified",
      });
    }

    await sendVerificationEmail(
      user.id,
    );

    return res.status(200).json({
      success: true,
      message:
        "Verification email sent",
    });
  } catch (error: any) {
    console.error(
      "RESEND VERIFICATION ERROR:",
    );

    console.error(error);

    return res.status(400).json({
      success: false,

      message:
        error?.message ||
        "Failed to resend verification email",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Current User
|--------------------------------------------------------------------------
*/

export async function me(
  req: AuthRequest,
  res: Response,
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
    );

    console.error(error);

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Server error",
    });
  }
}