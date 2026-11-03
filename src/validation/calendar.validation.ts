import {z} from 'zod'



// --------- query validation --------- //
export const getCalendarMonthQuerySchema = z.object({
    month: z.string().min(1, 'Month is required in query parameter').regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must follow the YYYY-MM format'),
    propertyId: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
});

export type GetCalendarMonthQuery = z.infer<typeof getCalendarMonthQuerySchema>;