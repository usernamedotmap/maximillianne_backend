import { BookingStatus, Prisma } from "@prisma/client";
import { Errors } from "../../../errors/appError.js";
import prisma from "../../../lib/prisma.js";
import {
  BlockDatesInput,
  CancelBookingInput,
  GetBlockedDatesQueryInput,
  GetBookingQueryInput,
} from "../../../validation/booking.validation.js";
import * as bookingRepository from "../../booking/booking.repository.js";
import * as blockDateRepository from "../../block-dates/blocked-dates.repository.js";
import { DEFAULT_PROPERTY_ID } from "../../../config/property.js";

const CANCELLABLE_STATUSES: readonly BookingStatus[] = ["pending", "approved"];

// ---------- Admin reads ----------

export const getBookingsByAdminService = async (
  query: GetBookingQueryInput,
) => {
  const { status, page, limit } = query;

  const [bookings, total] = await Promise.all([
    bookingRepository.findBookingList(status, page, limit),
    bookingRepository.countBookings(status),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPage: total === 0 ? 1 : Math.ceil(total / limit),
    },
  };
};

export const getAdminDashboardSummaryService = async () => {
  const now = new Date();
  const today = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [pendingRequests, upcomingBookings, monthlyGrossRevenue] = await Promise.all([
    bookingRepository.countBookings("pending"),
    bookingRepository.countUpcomingApprovedBookings(today),
    bookingRepository.sumApprovedBookingRevenue(monthStart, nextMonthStart),
  ]);

  return {
    pendingRequests,
    upcomingBookings,
    monthlyGrossRevenue: Number(monthlyGrossRevenue._sum.totalAmount ?? 0),
    revenueMonth: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
  };
};

export const getBookingIdByAdminService = async (id: string) => {
  const booking = await bookingRepository.findBookingId(id);

  if (!booking) throw Errors.notFound("Booking");

  const isExpiredPending =
    booking.status === "pending" &&
    (!booking.expiresAt || booking.expiresAt <= new Date());

  return isExpiredPending ? { ...booking, status: "expired" as const } : booking;
};

// ---------- Blocked date reads ----------

export const getBlockedDatesService = async (
  query: GetBlockedDatesQueryInput,
) => {
  const { page, limit } = query;
  const [blockedDates, total] = await Promise.all([
    blockDateRepository.findBlockedDateList(page, limit),
    blockDateRepository.countBlockedDates(),
  ]);

  return {
    blockedDates,
    pagination: {
      page,
      limit,
      total,
      totalPage: total === 0 ? 1 : Math.ceil(total / limit),
    },
  };
};

export const getBlockedDateByIdService = async (id: string) => {
  const blockedDate = await blockDateRepository.findBlockedDateById(id);
  if (!blockedDate) throw Errors.notFound("Blocked date");

  return blockedDate;
};

// ---------- Status changes ----------

export interface ApprovedBookingOptions {
  autoVerifyPaymentId?: string;
}

export const approvedBookingService = (
  id: string,
  propertyId: number = DEFAULT_PROPERTY_ID,
  options?: ApprovedBookingOptions,
) =>
  prisma.$transaction(async (tx) => {
    // This lock makes the overlap check and approval atomic against all date claims.
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    await bookingRepository.expirePendingBooking(id, new Date(), tx);
    const booking = await bookingRepository.findBookingId(id, tx);
    if (!booking) throw Errors.notFound("Booking");

    if (booking.status !== "pending" || !booking.expiresAt || booking.expiresAt <= new Date()) {
      throw Errors.conflict(
        booking.status === "pending"
          ? "This booking hold has expired and cannot be approved."
          : `This action cannot be used when the booking status is ${booking.status}`,
      );
    }

    if (options?.autoVerifyPaymentId) {
      await tx.payment.update({
        where: {
          id: options.autoVerifyPaymentId,
        },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      });
    }

    const payments = await tx.payment.findMany({
      where: {
        bookingId: id,
        verified: true,
      },
    });

    const totalVerifiedPaid = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const minimumDepositRequired = Math.round(
      Number(booking.totalAmount) * 0.5,
    );

    if (totalVerifiedPaid < minimumDepositRequired) {
      throw Errors.conflict(
        `Cannot approve booking: Verified payment of ₱${totalVerifiedPaid.toLocaleString()} is less than the required 50% deposit (₱${minimumDepositRequired.toLocaleString()}). Please verify payment proof first.`,
      );
    }

    const conflictingBooking = await bookingRepository.findFirstOverlappingBookings(
      {
        start: booking.checkIn,
        end: booking.checkOut,
        statuses: ["approved"],
        excludeBookingId: booking.id,
      },
      tx,
    );

    if (conflictingBooking) {
      throw Errors.conflict(
        `Dates are already booked by approved reservation #${conflictingBooking.id}`,
      );
    }

    const conflictBlock = await blockDateRepository.findFirstOverlappingBlock(
      booking.checkIn,
      booking.checkOut,
      tx,
    );

    if (conflictBlock) {
      throw Errors.conflict(
        `Dates overlap with owner blocked period: ${conflictBlock.reason} `,
      );
    }

    const approvedBooking = await bookingRepository.updateBookingStatus(
      id,
      { status: "approved" },
      tx,
    );

    const competingPending = await tx.booking.findMany({
      where: {
        id: { not: id },
        status: "pending",
        checkIn: { lt: booking.checkOut },
        checkOut: { gt: booking.checkIn },
      },
      select: { id: true },
    });

    if (competingPending.length > 0) {
      await tx.booking.updateMany({
        where: {
          id: {
            in: competingPending.map((b) => b.id),
          },
        },
        data: {
          status: "rejected",
          cancellationReason: "Dates were approved for another verified guest",
        },
      });
    }

    return approvedBooking;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

export const rejectBookingService = (id: string, propertyId: number = DEFAULT_PROPERTY_ID) =>
  prisma.$transaction(async (tx) => {
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    await bookingRepository.expirePendingBooking(id, new Date(), tx);
    const booking = await bookingRepository.findBookingId(id, tx);
    if (!booking) throw Errors.notFound("Booking");

    if (booking.status !== "pending") {
      throw Errors.conflict(
        `Cannot reject a booking with status ${booking.status}.`,
      );
    }

    return bookingRepository.updateBookingStatus(
      id,
      { status: "rejected" },
      tx,
    );
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

export const cancelBookingService = (id: string, input: CancelBookingInput, propertyId: number = DEFAULT_PROPERTY_ID) =>
  prisma.$transaction(async (tx) => {
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    await bookingRepository.expirePendingBooking(id, new Date(), tx);
    const booking = await bookingRepository.findBookingId(id, tx);
    if (!booking) throw Errors.notFound("Booking");

    if (!CANCELLABLE_STATUSES.includes(booking.status)) {
      throw Errors.conflict(
        `Cannot cancel a booking with status ${booking.status}`,
      );
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const bookingCheckIn = new Date(booking.checkIn);
    bookingCheckIn.setUTCHours(0, 0, 0, 0);

    if (booking.checkIn < today) {
      throw Errors.conflict(
        "Cannot cancel a booking whose check-in date has already passed",
      );
    }

    if (booking.status === "approved" && !input.reason?.trim()) {
      throw Errors.validation(
        "A cancellation reason is required for approved bookings",
      );
    }

    return bookingRepository.updateBookingStatus(
      id,
      {
        status: "cancelled",
        cancellationReason: input.reason ?? null,
        cancelledAt: new Date(),
      },
      tx,
    );
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

export const createBlockDateService = async (input: BlockDatesInput, propertyId: number = DEFAULT_PROPERTY_ID) => {
  const { startDate, endDate, reason } = input;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw Errors.validation("Start date cannot be  after end date");
  }

  return prisma.$transaction(async (tx) => {
    // Block creation claims the same unit dates as a booking, so it takes the same lock.
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    const approvedBookings = await bookingRepository.findOverlappingBookings(
      {
        start,
        end,
        statuses: ["approved"],
      },
      tx,
    );

    if (approvedBookings.length > 0) {
      throw Errors.conflict(
        `Cannot block: overlaps with approved bookings ${approvedBookings[0].id}`,
      );
    }

    return blockDateRepository.createBlockedDate({
      startDate: start,
      endDate: end,
      reason,
      
    }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
};

export const deleteBlockDateService = async (
  id: string,
  propertyId: number = DEFAULT_PROPERTY_ID,
) => {
  return prisma.$transaction(async (tx) => {
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    const blockedDate = await blockDateRepository.findBlockedDateById(id, tx);
    if (!blockedDate) throw Errors.notFound("Block dates");
    return blockDateRepository.deleteBlockedDateById(id, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
};
