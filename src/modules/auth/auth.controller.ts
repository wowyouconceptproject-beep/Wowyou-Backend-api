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
JSON.stringify(req.body, null, 2)
);


console.log(
  "DATABASE_URL EXISTS:",
  !!process.env.DATABASE_URL
);

console.log(
  "JWT_SECRET EXISTS:",
  !!process.env.JWT_SECRET
);

const result =
  await registerUser(
    req.body
  );

console.log(
  "REGISTER SUCCESS:",
  result.user?.email
);

return res.status(201).json({
  success: true,
  ...result,
});


} catch (error: any) {
console.error(
"REGISTER ERROR:"
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

export async function login(
req: Request,
res: Response
) {
try {
console.log(
"LOGIN ATTEMPT:",
req.body?.email
);


const {
  email,
  password,
} = req.body;

const result =
  await loginUser(
    email,
    password
  );

console.log(
  "LOGIN SUCCESS:",
  email
);

return res.status(200).json({
  success: true,
  ...result,
});


} catch (error: any) {
console.error(
"LOGIN ERROR:"
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
"ME ERROR:"
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
