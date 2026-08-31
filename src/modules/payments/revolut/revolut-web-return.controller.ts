import {
  Request,
  Response,
} from "express";

import { prisma } from "../../../lib/prisma";

/*
|--------------------------------------------------------------------------
| Web Payment Return
|--------------------------------------------------------------------------
|
| This endpoint is ONLY for attendee purchases made through the
| public WOWYOU web event page.
|
| IMPORTANT:
|
| This does NOT mark the purchase as paid.
|
| Revolut webhook remains the authoritative source for payment
| confirmation.
|
| Mobile attendee payments continue using the existing
| /payments/revolut/return endpoint and deep link.
|
*/

export async function webPaymentReturn(
  req: Request,
  res: Response,
) {
  try {
    /*
    |--------------------------------------------------------------------------
    | Purchase Reference
    |--------------------------------------------------------------------------
    */

    const purchaseId =
      String(
        req.query.purchase ?? "",
      ).trim();

    if (!purchaseId) {
      return res.status(400).send(
        "Missing purchase reference.",
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Purchase Exists
    |--------------------------------------------------------------------------
    */

    const purchase =
      await prisma.ticketPurchase.findUnique({
        where: {
          id: purchaseId,
        },

        select: {
          id: true,
        },
      });

    if (!purchase) {
      return res.status(404).send(
        "Purchase not found.",
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Return To Web Attendee Dashboard
    |--------------------------------------------------------------------------
    |
    | Payment status is NOT changed here.
    |
    | The Revolut webhook remains authoritative.
    |
    */

    const frontendUrl =
      (
        process.env
          .ATTENDEE_WEB_URL ??
        process.env
          .WEB_APP_URL ??
        process.env
          .NEXT_PUBLIC_WEB_URL ??
        ""
      ).replace(
        /\/+$/,
        "",
      );

    if (!frontendUrl) {
      console.error(
        "WEB PAYMENT RETURN ERROR: attendee web URL is not configured.",
      );

      return res.status(500).send(
        "Attendee web application URL is not configured.",
      );
    }

    const dashboardUrl =
      `${frontendUrl}/attendee/dashboard?purchase=${encodeURIComponent(
        purchase.id,
      )}`;

    return res.redirect(
      302,
      dashboardUrl,
    );
  } catch (error) {
    console.error(
      "WEB PAYMENT RETURN ERROR:",
      error,
    );

    return res.status(500).send(
      "Unable to process payment return.",
    );
  }
}