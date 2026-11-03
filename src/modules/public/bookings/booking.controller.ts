import { Request, Response } from "express";
import { CreateBookingRequestSchema } from "../../../dto/booking.dto.js";
import * as bookingService from "./booking.service.js";
import { HttpStatus } from "../../../errors/http-status.js";
import { DEFAULT_PROPERTY_ID } from "../../../config/property.js";
import { BookingIdParams } from "../../../validation/booking.validation.js";

export const createBookingsController = async (req: Request, res: Response) => {
  const body = CreateBookingRequestSchema.parse(req.body);

  const bookings = await bookingService.createBookingsService(body, DEFAULT_PROPERTY_ID);

  res.status(HttpStatus.CREATED).json({
    message: "Booking created successfully",
    bookings,
  });
};

export const getBookingPaymentDetailsController = async (
  req: Request,
  res: Response,
) => {
  const { id } = BookingIdParams.parse(req.params);
  const booking = await bookingService.getBookingPaymentDetailsService(id);

  res.status(HttpStatus.OK).json({
    message: "Booking payment details retrieved successfully",
    booking,
  });
};
