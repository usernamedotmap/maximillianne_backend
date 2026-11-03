import {z} from 'zod'
import { CreateGuestSchema } from '../validation/guest.validation.js'
import { CreateBookingSchema } from '../validation/booking.validation.js'

export const CreateBookingRequestSchema = z.object({
    guest: CreateGuestSchema,
    booking: CreateBookingSchema
});

export type CreateBookingRequestInput = z.infer<typeof CreateBookingRequestSchema>;