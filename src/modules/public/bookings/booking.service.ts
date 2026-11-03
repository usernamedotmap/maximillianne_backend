import { CreateBookingRequestInput } from "../../../dto/booking.dto.js";
import * as guestRepository from "../../guest/guest.repository.js";
import * as bookingRepository from "../../booking/booking.repository.js";
import * as propertyRepository from "../property/property.repository.js";
import * as blockDateRepository from "../../block-dates/blocked-dates.repository.js";
import { Errors } from "../../../errors/appError.js";
import prisma from "../../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { DEFAULT_PROPERTY_ID } from "../../../config/property.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const PENDING_HOLDS_HOURS = 24;

export const createBookingsService = async (
  input: CreateBookingRequestInput,
  propertyId: number = DEFAULT_PROPERTY_ID,
) => {
  const { guest: guestInput, booking: bookingInput } = input;
  const checkInDate = new Date(bookingInput.checkIn);
  const checkOutDate = new Date(bookingInput.checkOut);

  const nights = Math.round(
    (checkOutDate.getTime() - checkInDate.getTime()) / MS_PER_DAY,
  );

  if (nights < 1) {
    throw Errors.badRequest("Check-out must be after check-in");
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (checkInDate < today) {
    throw Errors.badRequest("Check-in date cannot be in the past");
  }

  const property = await propertyRepository.findById(propertyId);
  if (!property) {
    throw Errors.notFound("Property");
  }

  if (property.maxGuests && bookingInput.guestCount > property.maxGuests) {
    throw Errors.badRequest(`Maximum capacity is ${property.maxGuests} guests`);
  }

  const nightlyRate = property.nightlyRate;
  const totalAmount = Number(nightlyRate) * nights;
  const requiredDownpayment = Math.round(totalAmount * 0.5);

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + PENDING_HOLDS_HOURS * 60 * 60 * 1000,
  );

  return prisma.$transaction(async (tx) => {
    // Serialize all date claims for this single unit, including admin blocks/approvals.
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    await bookingRepository.expirePendingBookings(now, tx);

    const [conflicts, blocked] = await Promise.all([
      bookingRepository.findOverlappingBookings(
        {
          start: checkInDate,
          end: checkOutDate,
          statuses: ["approved", "pending"],
          now,
        },
        tx,
      ),
      blockDateRepository.findOverlappingBlocks(checkInDate, checkOutDate, tx),
    ]);

    if (conflicts.length > 0 || blocked.length > 0) {
      throw Errors.conflict("Selected dates are no longer available");
    }

    const guest = await guestRepository.upsertGuest(guestInput, tx);

    const booking = await bookingRepository.createBooking(
      {
        guest: {
          connect: { id: guest.id },
        },
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guestCount: bookingInput.guestCount,
        status: "pending",
        nightlyRate,
        totalAmount,
        expiresAt,
        notes: bookingInput.notes ?? null,
      },
      tx,
    );

    return {
      bookingId: booking.id,
      status: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights,
      guestCounts: booking.guestCount,
      pricing: {
        nightlyRate,
        totalAmount,
        requiredDownpayment,
        currency: "PHP",
      },
      expiresAt: booking.expiresAt,
      guest: {
        fullName: guest.fullName,
        email: guest.email,
        phone: guest.phone,
      },
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
};

export const getBookingPaymentDetailsService = async (
  bookingId: string,
  propertyId: number = DEFAULT_PROPERTY_ID,
) => {
  const now = new Date();
  const booking = await prisma.$transaction(async (tx) => {
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    await bookingRepository.expirePendingBookings(now, tx);
    return bookingRepository.findBookingId(bookingId, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

  if (!booking) {
    throw Errors.notFound("Booking");
  }

  const paymentSubmitted = booking.payment.some(
    (payment) => payment.proofFileKey !== null,
  );
  const paymentVerified = booking.payment.some((payment) => payment.verified);
  const isActivePending =
    booking.status === "pending" &&
    booking.expiresAt !== null &&
    booking.expiresAt > now;

  return {
    bookingId: booking.id,
    status: booking.status,
    checkIn: booking.checkIn.toISOString().slice(0, 10),
    checkOut: booking.checkOut.toISOString().slice(0, 10),
    totalAmount: Number(booking.totalAmount),
    downpaymentAmount: Math.round(Number(booking.totalAmount) * 0.5),
    cancellationReason: booking.cancellationReason,
    expiresAt: booking.expiresAt,
    canUploadProof: isActivePending && !paymentVerified,
    paymentSubmitted,
    paymentVerified,
  };
};
