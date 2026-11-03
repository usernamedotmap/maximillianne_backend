import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { DEFAULT_PROPERTY_ID } from "../../config/property.js";
import * as bookingRepository from "./booking.repository.js";

/** Expiry is terminal: a pending hold past its 24-hour deadline cannot be revived. */
export const expirePendingBookings = async (
  propertyId: number = DEFAULT_PROPERTY_ID,
) =>
  prisma.$transaction(async (tx) => {
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    return bookingRepository.expirePendingBookings(new Date(), tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

/** Periodic cleanup keeps admin lists/lifecycle state current without an external scheduler. */
export const startBookingExpiryWorker = (intervalMs = 60_000) => {
  const sweep = () => {
    void expirePendingBookings().catch((error: unknown) => {
      console.error("Booking expiry sweep failed:", error);
    });
  };

  sweep();
  const timer = setInterval(sweep, intervalMs);
  timer.unref();
};
