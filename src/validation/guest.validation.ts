import { z } from "zod";

export const CreateGuestSchema = z.object({
  fullName: z.string().trim().min(1, "Guest full name is required").max(100),
  phone: z
    .string()
    .trim()
    .min(1, "Guest phone number is required")
    .max(100)
    .regex(
      /^(?:09\d{9}|\+639\d{9}|639\d{9})$/,
      "Guest phone number must be a valid Philippine mobile number",
    ),
  email: z
    .string()
    .trim()
    .pipe(z.email("Guest email must be valid").max(255))
    .optional(),
});

export type CreateGuestInput = z.infer<typeof CreateGuestSchema>;
