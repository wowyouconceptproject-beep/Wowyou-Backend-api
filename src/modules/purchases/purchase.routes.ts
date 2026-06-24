import { Router } from "express";

import { auth } from "../auth/auth.middleware";

import {
create,
} from "./purchase.controller";

const router = Router();

router.post(
"/create",
auth,
create
);

export default router;
