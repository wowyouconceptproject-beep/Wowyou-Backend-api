import { Request, Response } from "express";

import {
  createApplication,
  listApplications,
  listEventApplications,
  approveApplication,
  rejectApplication,
  withdrawApplication,
} from "./vendor.service";

import {
  vendorApplicationCreated,
  vendorApplicationUpdated,
} from "../realtime/vendor";

/*
|--------------------------------------------------------------------------
| Create Vendor Application
|--------------------------------------------------------------------------
*/

export async function create(
  req: Request,
  res: Response,
) {
  try {
    const application =
      await createApplication({
        eventId:
          req.body.eventId,

        businessName:
          req.body.businessName,

        category:
          req.body.category,

        contactName:
          req.body.contactName,

        email:
          req.body.email,

        phone:
          req.body.phone,

        description:
          req.body.description,

        boothSize:
          req.body.boothSize,

        message:
          req.body.message,
      });

    vendorApplicationCreated({
      eventId:
        application.eventId,

      application,
    });

    return res.status(201).json({
      success: true,

      application,
    });
  } catch (error: any) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create application.";

    const status =
      message ===
      "Event not found."
        ? 404
        : message.includes(
            "already applied",
          )
        ? 409
        : 400;

    return res.status(status).json({
      success: false,

      message,
    });
  }
}

/*
|--------------------------------------------------------------------------
| My Applications
|--------------------------------------------------------------------------
*/

export async function myApplications(
  req: Request,
  res: Response,
) {
  try {
    const email =
      String(
        req.query.email ?? "",
      );

    if (!email) {
      return res.status(400).json({
        success: false,

        message:
          "Email is required.",
      });
    }

    const applications =
      await listApplications(
        email,
      );

    return res.json({
      success: true,

      applications,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Internal server error.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Event Applications
|--------------------------------------------------------------------------
*/

export async function eventApplications(
  req: Request,
  res: Response,
) {
  try {
    const applications =
      await listEventApplications(
        String(
          req.params.eventId,
        ),
      );

    return res.json({
      success: true,

      applications,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Internal server error.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Approve Application
|--------------------------------------------------------------------------
*/

export async function approve(
  req: Request,
  res: Response,
) {
  try {
    const application =
      await approveApplication(
        String(
          req.params.id,
        ),
      );

    vendorApplicationUpdated({
      eventId:
        application.eventId,

      application,
    });

    return res.json({
      success: true,

      application,
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Application not found.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Reject Application
|--------------------------------------------------------------------------
*/

export async function reject(
  req: Request,
  res: Response,
) {
  try {
    const application =
      await rejectApplication(
        String(
          req.params.id,
        ),
      );

    vendorApplicationUpdated({
      eventId:
        application.eventId,

      application,
    });

    return res.json({
      success: true,

      application,
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Application not found.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Withdraw Application
|--------------------------------------------------------------------------
*/

export async function withdraw(
  req: Request,
  res: Response,
) {
  try {
    await withdrawApplication(
      String(
        req.params.id,
      ),
    );

    return res.json({
      success: true,

      message:
        "Application withdrawn.",
    });
  } catch (error: any) {
    return res.status(404).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Application not found.",
    });
  }
}