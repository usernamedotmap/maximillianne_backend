import { Request, Response } from "express";
import {
  BlockDatesSchema,
  BookingIdParams,
  CancelBookingSchema,
  GetBlockedDatesQuerySchema,
  GetBookingStatusQuerySchema,
} from "../../../validation/booking.validation.js";
import * as bookingService from "../bookings/booking.service.js";
import { HttpStatus } from "../../../errors/http-status.js";
import { DEFAULT_PROPERTY_ID } from "../../../config/property.js";

export const getBookingsByAdmin = async (req: Request, res: Response) => {
  const query = GetBookingStatusQuerySchema.parse(req.query);

  const { bookings, pagination } =
    await bookingService.getBookingsByAdminService(query);

  res.status(HttpStatus.OK).json({
    message: "Bookings fetch successfully",
    bookings,
    pagination,
  });
};

export const getAdminDashboardSummary = async (_req: Request, res: Response) => {
  const summary = await bookingService.getAdminDashboardSummaryService();

  res.status(HttpStatus.OK).json({
    message: "Admin dashboard summary fetched successfully",
    summary,
  });
};

export const getBookingIdByAdmin = async (req: Request, res: Response) => {
  const { id } = BookingIdParams.parse(req.params);

  const bookings = await bookingService.getBookingIdByAdminService(id);

  res.status(HttpStatus.OK).json({
    message: "Booking fetch successfully",
    bookings,
  });
};

export const getBlockedDates = async (req: Request, res: Response) => {
  const query = GetBlockedDatesQuerySchema.parse(req.query);
  const { blockedDates, pagination } =
    await bookingService.getBlockedDatesService(query);

  res.status(HttpStatus.OK).json({
    message: "Blocked dates fetched successfully",
    blockedDates,
    pagination,
  });
};

export const getBlockedDateById = async (req: Request, res: Response) => {
  const { id } = BookingIdParams.parse(req.params);
  const blockedDate = await bookingService.getBlockedDateByIdService(id);

  res.status(HttpStatus.OK).json({
    message: "Blocked date fetched successfully",
    blockedDate,
  });
};

export const approvedBooking = async (req: Request, res: Response) => {
  const { id } = BookingIdParams.parse(req.params);

  const bookings = await bookingService.approvedBookingService(id, DEFAULT_PROPERTY_ID);

  res.status(HttpStatus.OK).json({
    message: "Booking approved  successfully",
    bookings,
  });
};

export const rejectBooking = async (req: Request, res: Response) => {
  const { id } = BookingIdParams.parse(req.params);

  const bookings = await bookingService.rejectBookingService(id, DEFAULT_PROPERTY_ID);

  res.status(HttpStatus.OK).json({
    message: " Booking reject successfully",
    bookings,
  });
};

export const cancelBooking = async (req: Request, res: Response) => {
  const { id } = BookingIdParams.parse(req.params);
  const body = CancelBookingSchema.parse(req.body);

  const booking = await bookingService.cancelBookingService(id, body, DEFAULT_PROPERTY_ID);

  res.status(HttpStatus.OK).json({
    message: "Booking cancel successfully",
    booking,
  });
};

export const blockedDates = async (req: Request, res: Response) => {
  const body = BlockDatesSchema.parse(req.body);

  const blockedDates = await bookingService.createBlockDateService(body, DEFAULT_PROPERTY_ID);

  res.status(HttpStatus.OK).json({
    message: "Block a date successfully",
    blockedDates,
  });
};

export const deleteBlockedDates = async (req: Request, res: Response) => {
  const { id } = BookingIdParams.parse(req.params);
  const blockedDates = await bookingService.deleteBlockDateService(id, DEFAULT_PROPERTY_ID);

  res.status(HttpStatus.OK).json({
    message: "Deleted blocked date successfully",
    blockedDates,
  });
};
