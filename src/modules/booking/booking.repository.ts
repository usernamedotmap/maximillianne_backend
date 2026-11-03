import { BookingStatus, Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";

export type DbClient = typeof prisma | Prisma.TransactionClient;

export type DateRange = {
  start: Date;
  end: Date;
};

// Bookings are night-based half-open intervals: [checkIn, checkOut)
const dateOverlapFilter = (start: Date, end: Date) => ({
  checkIn: { lt: end },
  checkOut: { gt: start },
});

// ---------- Reads ----------
export const findBookingId = (id: string, db: DbClient = prisma) =>
  db.booking.findUnique({
    where: {
      id,
    },
    include: {
      guest: true,
      payment: true,
    },
  });

export const findBookingByTrackingReference = (
  trackingReference: string,
  db: DbClient = prisma,
) =>
  db.booking.findUnique({
    where: { trackingReference },
    include: { guest: true, payment: true },
  });

export const findPublicBookingStatus = (
  trackingReference: string,
  db: DbClient = prisma,
) =>
  db.booking.findUnique({
    where: { trackingReference },
    select: {
      trackingReference: true,
      checkIn: true,
      checkOut: true,
      status: true,
      expiresAt: true,
      guest: { select: { fullName: true } },
      payment: {
        select: {
          verified: true,
          proofFileKey: true,
        },
      },
    },
  });

export const findBookingList = (
  status: BookingStatus,
  page: number,
  limit: number,
  db: DbClient = prisma,
) =>
  db.booking.findMany({
    where: status ? { status } : {},
    include: { guest: true, payment: true },
    orderBy: [{ createdAt: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

export const countBookings = (status: BookingStatus, db: DbClient = prisma) =>
  db.booking.count({
    where: status ? { status } : {},
  });

export const countUpcomingApprovedBookings = (today: Date, db: DbClient = prisma) =>
  db.booking.count({
    where: {
      status: "approved",
      checkIn: { gte: today },
    },
  });

export const sumApprovedBookingRevenue = (
  start: Date,
  end: Date,
  db: DbClient = prisma,
) =>
  db.booking.aggregate({
    where: {
      status: "approved",
      checkIn: { gte: start, lt: end },
    },
    _sum: { totalAmount: true },
  });

// ------- coflic query

export interface OverlapQueryOptions {
  start: Date;
  end: Date;
  statuses: BookingStatus[];
  excludeBookingId?: string;
  now?: Date;
}

export const findFirstOverlappingBookings = (
  {
    start,
    end,
    statuses,
    excludeBookingId,
    now = new Date(),
  }: OverlapQueryOptions,
  db: DbClient = prisma,
) => {
  return db.booking.findFirst({
    where: {
      ...dateOverlapFilter(start, end),
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      status: {
        in: statuses,
      },
      OR: [
        { status: { not: "pending" } },
        {
          status: "pending",
          expiresAt: { gt: now },
        },
      ],
    },
    select: {
      id: true,
      status: true,
      checkIn: true,
      checkOut: true,
    },
  });
};




export const findOverlappingBookings = (
  {
    start,
    end,
    statuses,
    excludeBookingId,
    now = new Date(),
  }: OverlapQueryOptions,
  db: DbClient = prisma,
) => {
  // Pending rows without an expiry are not valid holds. The expiry sweep
  // transitions them to `expired`, so they must not block new availability.
  const activeStatusFilters: Prisma.BookingWhereInput[] = statuses
    .filter((status) => status !== "pending")
    .map((status) => ({ status }));

  if (statuses.includes("pending")) {
    activeStatusFilters.push({ status: "pending", expiresAt: { gt: now } });
  }

  return db.booking.findMany({
    where: {
      ...dateOverlapFilter(start, end),
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      OR: activeStatusFilters,
    },
    select: {
      id: true,
      status: true,
      checkIn: true,
      checkOut: true,
    },
  });
};

/**
 * Serialize date-claiming operations for a property across all app instances.
 * This is a lock key, not a Booking-to-Property relation; this app currently
 * has one unit and uses DEFAULT_PROPERTY_ID (1).
 */
export const lockPropertyAvailability = (
  propertyId: number,
  db: DbClient,
) => db.$executeRaw`SELECT pg_advisory_xact_lock(${BigInt(propertyId)})`;

/** Turn expired (or invalid legacy null-expiry) pending requests into terminal status. */
export const expirePendingBookings = (now: Date, db: DbClient = prisma) =>
  db.booking.updateMany({
    where: {
      status: "pending",
      OR: [{ expiresAt: { lte: now } }, { expiresAt: null }],
    },
    data: { status: "expired" },
  });

// -- for writes//

export const createBooking = (
  data: Prisma.BookingCreateInput,
  db: DbClient = prisma,
) => db.booking.create({ data });

export const updateBookingStatus = (
  id: string,
  data: {
    status: BookingStatus;
    cancellationReason?: string | null;
    cancelledAt?: Date | null;
  },
  db: DbClient = prisma,
) =>
  db.booking.update({
    where: { id },
    data,
  });

// export const findBlockedDateById = async (id: string, db: DbClient = prisma) =>
//   db.blockedDate.delete({
//     where: {
//       id,
//     },
//   });

// // ---------- Overlap & Availability Checks ----------

// /** Approved bookings overlapping the range, excluding the target booking */

// export const findApprovedOverlapping = (
//   range: DateRange,
//   excludeBookingId?: string,
//   db: DbClient = prisma,
// ) =>
//   db.booking.findMany({
//     where: {
//       status: "approved",
//       ...bookingOverlaps(range),
//       ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
//     },
//     select: { id: true, checkIn: true, checkOut: true },
//   });

// /**
//  * Blocked dates overlapping a stay range.
//  * Blocked dates are inclusive of both start and end dates.
//  */
// export const findOverlappingBlockedDates = (
//   range: DateRange,
//   db: DbClient = prisma,
// ) =>
//   db.blockedDate.findMany({
//     where: {
//       startDate: { lt: range.end },
//       endDate: { gte: range.start }, // gte handles single-day blocks correctly
//     },
//   });

// export const findConflictingBookings = (
//   checkIn: Date,
//   checkOut: Date,
//   exludeBookingsId?: string,
//   db: DbClient = prisma,
// ) =>
//   db.booking.findMany({
//     where: {
//       checkIn: {
//         lt: checkOut,
//       },
//       checkOut: {
//         gt: checkIn,
//       },
//       ...(exludeBookingsId ? { id: { not: exludeBookingsId } } : {}),
//     },
//     select: {
//       id: true,
//       status: true,
//       checkIn: true,
//       checkOut: true,
//     },
//   });

// // ---------- Writes ----------

// export const updateToApproved = (id: string, db: DbClient = prisma) =>
//   db.booking.update({
//     where: { id },
//     data: { status: "approved" },
//   });

// export const updateToReject = (id: string, db: DbClient = prisma) =>
//   db.booking.update({
//     where: { id },
//     data: { status: "rejected" },
//   });

// export const updateToCancel = (
//   id: string,
//   reason: string | undefined,
//   db: DbClient = prisma,
// ) =>
//   db.booking.update({
//     where: { id },
//     data: {
//       status: "cancelled",
//       cancellationReason: reason ?? null,
//       cancelledAt: new Date(),
//     },
//   });

// export const createBlockedDate = (
//   data: {
//     startDate: Date;
//     endDate: Date;
//     reason?: string;
//   },
//   db: DbClient = prisma,
// ) =>
//   db.blockedDate.create({
//     data,
//   });

// export const createBooking = (
//   data: Prisma.BookingCreateInput,
//   db: DbClient = prisma,
// ) => db.booking.create({ data });

// export const deleteBlockedDateById = (id: string, db: DbClient = prisma) =>
//   db.blockedDate.findUnique({
//     where: {
//       id,
//     },
//   });
