import { Router } from "express";
import {
  createBookingsController,
  getBookingPaymentDetailsController,
} from "./booking.controller.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { uploadPaymentProof } from "../../../middleware/upload.js";
import { submitPublicPaymentProof } from "../../payment/payment.controller.js";
import rateLimit from "express-rate-limit";
import { getPublicBookingStatusController } from "./booking.controller.js";

const bookingRoutes = Router();
const bookingStatusRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

bookingRoutes.post("/", asyncHandler(createBookingsController));
bookingRoutes.get(
  "/:id/status",
  bookingStatusRateLimit,
  asyncHandler(getPublicBookingStatusController),
);
bookingRoutes.get("/:id", asyncHandler(getBookingPaymentDetailsController));
bookingRoutes.post(
  "/:id/payment-proof",
  uploadPaymentProof,
  asyncHandler(submitPublicPaymentProof),
);

export default bookingRoutes;