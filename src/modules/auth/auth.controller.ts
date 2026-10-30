
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

import { resendLoginOtp } from "./login-otp.service";

import {
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
} from "./password-reset.service";

const isBrowserClient = (req: Request): boolean =>
  req.get("X-Auth-Mode") === "cookie";

/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
*/

export async function register(req: Request, res: Response) {
  try {
    const result = await registerUser(req.body);

    try {
      await sendVerificationEmail(result.user.id);
    } catch (emailError) {
      console.error("VERIFICATION EMAIL ERROR:", emailError);
    }

    // Preserve JWT registration compatibility.
    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("REGISTER ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Registration failed",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("LOGIN ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Login failed",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Verify Login OTP
|--------------------------------------------------------------------------
*/

export async function verifyLoginCode(req: Request, res: Response) {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    const otp = String(req.body?.otp ?? "").trim();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    const result = await completeLogin(email, otp);

    console.log("LOGIN OTP VERIFIED:", email);

    // Return the seven-day JWT to browser and mobile clients.
    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error: unknown) {
    console.error("VERIFY LOGIN OTP ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Verification failed",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Resend Login OTP
|--------------------------------------------------------------------------
*/

export async function resendLoginCode(req: Request, res: Response) {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    await resendLoginOtp(email);

    return res.status(200).json({
      success: true,
      message: "Login code sent",
    });
  } catch (error: unknown) {
    console.error("RESEND LOGIN OTP ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to resend login code",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

export async function logout(req: Request, res: Response) {
  // JWT logout is handled client-side by clearing the stored token.
  // No server-side session cookie is required.
  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
}

/*
|--------------------------------------------------------------------------
| Verify Email
|--------------------------------------------------------------------------
*/

export async function verifyEmail(req: Request, res: Response) {
  try {
    const token = String(req.query.token ?? "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const result = await verifyUserEmail(token);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      ...result,
    });
  } catch (error: unknown) {
    console.error("VERIFY EMAIL ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Email verification failed",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Resend Verification Email
|--------------------------------------------------------------------------
*/

export async function resendVerification(req: Request, res: Response) {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    await sendVerificationEmail(user.id);

    return res.status(200).json({
      success: true,
      message: "Verification email sent",
    });
  } catch (error: unknown) {
    console.error("RESEND VERIFICATION ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to resend verification email",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Current User
|--------------------------------------------------------------------------
*/

export async function me(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { password: _password, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error: unknown) {
    console.error("ME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Forgot Password
|--------------------------------------------------------------------------
*/

export async function forgotPassword(req: Request, res: Response) {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const result = await requestPasswordReset(email);

    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process the request. Please try again.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Verify Password Reset Code
|--------------------------------------------------------------------------
*/

export async function verifyResetCode(req: Request, res: Response) {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    const code = String(req.body?.code ?? "").trim();

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and reset code are required.",
      });
    }

    const result = await verifyPasswordResetCode(email, code);

    return res.status(200).json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Code verification failed.";

    const expectedError =
      message.includes("required") ||
      message.includes("valid email") ||
      message.includes("Invalid or expired");

    return res.status(expectedError ? 400 : 500).json({
      success: false,
      message: expectedError
        ? message
        : "Unable to verify the code. Please try again.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/

export async function resetPasswordController(
  req: Request,
  res: Response,
) {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();

    const resetToken = String(req.body?.resetToken ?? "").trim();
    const newPassword = req.body?.newPassword;

    if (!email || !resetToken || typeof newPassword !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email, reset token and new password are required.",
      });
    }

    const result = await resetPassword(email, resetToken, newPassword);

    return res.status(200).json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Password reset failed.";

    const expectedError =
      message.includes("required") ||
      message.includes("at least") ||
      message.includes("must not exceed") ||
      message.includes("Invalid or expired");

    return res.status(expectedError ? 400 : 500).json({
      success: false,
      message: expectedError
        ? message
        : "Unable to reset your password. Please try again.",
    });
  }
}
