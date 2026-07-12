import { z } from "zod";

export const createVendorApplicationSchema =
  z.object({
    eventId: z.string().min(1),

    businessName: z
      .string()
      .min(2)
      .max(120),

    category: z
      .string()
      .min(2)
      .max(80),

    contactName: z
      .string()
      .min(2)
      .max(120),

    email: z
      .string()
      .email(),

    phone: z
      .string()
      .min(7)
      .max(30),

    description: z
      .string()
      .min(10)
      .max(5000),

    boothSize: z
      .string()
      .max(80)
      .optional(),

    message: z
      .string()
      .max(1000)
      .optional(),
  });

export type CreateVendorApplicationInput =
  z.infer<
    typeof createVendorApplicationSchema
  >;