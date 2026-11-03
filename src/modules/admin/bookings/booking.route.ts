import { Router } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  approvedBooking,
  blockedDates,
  cancelBooking,
  deleteBlockedDates,
  getAdminDashboardSummary,
  getBlockedDateById,
  getBlockedDates,
  getBookingIdByAdmin,
  getBookingsByAdmin,
  rejectBooking,
} from "./booking.controller.js";
import { authenticate } from "../../../middleware/authenticate.js";

const bookingRoute = Router();

bookingRoute.use(authenticate);

bookingRoute.get("/summary", asyncHandler(getAdminDashboardSummary));
bookingRoute.get("/", asyncHandler(getBookingsByAdmin));

bookingRoute.post("/blocked-dates", asyncHandler(blockedDates));
bookingRoute.get("/blocked-dates", asyncHandler(getBlockedDates));
bookingRoute.get("/blocked-dates/:id", asyncHandler(getBlockedDateById));
bookingRoute.delete("/blocked-dates/:id", asyncHandler(deleteBlockedDates));
bookingRoute.get("/:id", asyncHandler(getBookingIdByAdmin));
bookingRoute.patch("/:id/approved", asyncHandler(approvedBooking));
bookingRoute.patch("/:id/reject", asyncHandler(rejectBooking));
bookingRoute.patch("/:id/cancel", asyncHandler(cancelBooking));

export default bookingRoute;
