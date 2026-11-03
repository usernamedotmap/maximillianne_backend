import * as bookingRepository from "../../booking/booking.repository.js";
import * as propertySettingsRepository from "../property/property.repository.js";
import * as blockDatesRepository from "../../block-dates/blocked-dates.repository.js";
import { Errors } from "../../../errors/appError.js";
import { expirePendingBookings } from "../../booking/booking-expiry.service.js";

const toDateStr = (d: Date | string): string => {
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getMonthAvailability = async (
  monthStr: string,
  propertyId: number = 1,
) => {
  await expirePendingBookings(propertyId);
  const [year, month] = monthStr.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();

  // month date bounds
  const startDateStr = `${year}-${pad(month)}-01`;
  const endDateStr = `${year}-${pad(month)}-${pad(lastDay)}`;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const now = new Date();

  const [property, bookings, blockDates] = await Promise.all([
    propertySettingsRepository.findById(propertyId),
    bookingRepository.findOverlappingBookings({
      start: monthStart,
      end: monthEnd,
      statuses: ["approved", "pending"],
      now,
    }),
    blockDatesRepository.findOverlappingBlocks(monthStart, monthEnd),
  ]);

  if (!property) throw Errors.notFound("Property");

  const approvedRanges = bookings
    .filter((b) => b.status === "approved")
    .map((b) => ({
      start: toDateStr(b.checkIn),
      end: toDateStr(b.checkOut),
    }));

  const pendingRanges = bookings
    .filter((b) => b.status === "pending")
    .map((b) => ({
      start: toDateStr(b.checkIn),
      end: toDateStr(b.checkOut),
    }));

  const blockedRanges = blockDates.map((b) => ({
    start: toDateStr(b.startDate),
    end: toDateStr(b.endDate),
  }));

  const isNightOccupied = (
    dateStr: string,
    ranges: { start: string; end: string }[],
  ) => ranges.some((r) => dateStr >= r.start && dateStr < r.end);

  const days = [];
  let openCount = 0;
  let pendingCount = 0;
  let reserveCount = 0;
  let blockedCount = 0;

  for (let day = 1; day <= lastDay; day++) {
    const curDateStr = `${year}-${pad(month)}-${pad(day)}`;

    const isBlocked = isNightOccupied(curDateStr, blockedRanges);
    const isReserved = isNightOccupied(curDateStr, approvedRanges);
    const isPending = isNightOccupied(curDateStr, pendingRanges);

    let status: "blocked" | "reserved" | "pending" | "open" = "open";

    if (isBlocked) {
      status = "blocked";
      blockedCount++;
    } else if (isReserved) {
      status = "reserved";
      reserveCount++;
    } else if (isPending) {
      status = "pending";
      pendingCount++;
    } else {
      status = "open";
      openCount++;
    }

    days.push({
      date: curDateStr,
      dayOfMonth: day,
      status,
      rate: property.nightlyRate,
      isAvailable: status === "open",
      isCheckInAllowed: status === "open",
    });
  }

  return {
    propertyName: property.name,
    month: monthStr,
    startDate: startDateStr,
    endDate: endDateStr,
    summary: {
      totalDays: lastDay,
      openDays: openCount,
      pendingDays: pendingCount,
      reservedDays: reserveCount,
      blockedDays: blockedCount,
      occupancyRatePercent: Math.round(
        ((reserveCount + blockedCount) / lastDay) * 100,
      ),
    },
    days,
  };
};
