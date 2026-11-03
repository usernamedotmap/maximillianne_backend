import { BookingStatus } from "@prisma/client";
import { z } from "zod";

// --------- input validation ----------- //
export const CreateBookingSchema = z
  .object({
    checkIn: z.iso
      .date("Check-in must follow the YYYY-MM-DD format")
      .transform((val) => new Date(`${val}T00:00:00.000Z`)),
    checkOut: z.iso
      .date("Check-in must follow the YYYY-MM-DD format")
      .transform((val) => new Date(`${val}T00:00:00.000Z`)),
    guestCount: z.coerce
      .number()
      .int()
      .min(1, "Guest count must be at least 1")
      .max(6, "Guest count must be at most 6"),
    notes: z.string().trim().max(65535).optional(),
  })
  .refine(({ checkIn, checkOut }) => checkOut > checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const CancelBookingSchema = z.object({
  reason: z.string().trim().min(1).max(250).optional(),
});

export type CancelBookingInput = z.infer<typeof CancelBookingSchema>;

export const BlockDatesSchema = z
  .object({
    startDate: z
     .iso.date("Check-in must follow the YYYY-MM-DD format")
      .transform((val) => new Date(`${val}T00:00:00.000Z`)),
    endDate: z

    .iso.date("Check-in must follow the YYYY-MM-DD format")
      .transform((val) => new Date(`${val}T00:00:00.000Z`)),
    reason: z.string().trim().min(1).max(255).optional(),
  })
  .refine(({ startDate, endDate }) => endDate > startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type BlockDatesInput = z.infer<typeof BlockDatesSchema>;

export const GetBlockedDatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type GetBlockedDatesQueryInput = z.infer<
  typeof GetBlockedDatesQuerySchema
>;

// ---------- query validation ------------ //
export const GetBookingStatusQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type GetBookingQueryInput = z.infer<typeof GetBookingStatusQuerySchema>;

// -------- ID params -------- //
export const BookingIdParams = z.object({
  id: z.string().trim().uuid(),
});

export type BookingIdParamsInput = z.infer<typeof BookingIdParams>;
