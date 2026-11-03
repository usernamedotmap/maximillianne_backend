import { Router } from "express";
import bookingRoute from "./bookings/booking.route.js";
import paymentRoute from "./payment/payment.route.js";

const adminRoutes = Router();

adminRoutes.use("/bookings", bookingRoute)
adminRoutes.use("/payments", paymentRoute)

export default adminRoutes;