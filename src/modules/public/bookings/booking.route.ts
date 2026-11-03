import { Router } from "express";
import {
  createBookingsController,
  getBookingPaymentDetailsController,
} from "./booking.controller.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { uploadPaymentProof } from "../../../middleware/upload.js";
import { submitPublicPaymentProof } from "../../payment/payment.controller.js";

const bookingRoutes = Router();

bookingRoutes.post("/", asyncHandler(createBookingsController));
bookingRoutes.get("/:id", asyncHandler(getBookingPaymentDetailsController));
bookingRoutes.post(
  "/:id/payment-proof",
  uploadPaymentProof,
  asyncHandler(submitPublicPaymentProof),
);

export default bookingRoutes;