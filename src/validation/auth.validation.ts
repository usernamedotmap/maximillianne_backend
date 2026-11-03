import {z} from "zod";


export const loginSchema = z.object({
    email: z.string().trim().email("Invalid email address").max(255, "Email address must be less than 255 characters"),
    password: z.string().trim().min(8, "Password must be at least 8 characters").max(255, "Password must be less than 255 characters"),
});


export type LoginInput = z.infer<typeof loginSchema>;