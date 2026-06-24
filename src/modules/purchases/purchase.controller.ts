import { Response } from "express";

import { AuthRequest } from "../auth/auth.middleware";

import {
createPurchase,
} from "./purchase.service";

export async function create(
req: AuthRequest,
res: Response
) {
try {
const result =
await createPurchase(
req.user!.userId,
req.body.ticketTypeId,
Number(
req.body.quantity
)
);


return res.status(201).json({
  success: true,
  checkoutUrl:
    result.checkoutUrl,
  purchase:
    result.purchase,
});


} catch (error: any) {
return res.status(400).json({
success: false,
message:
error.message,
});
}
}
