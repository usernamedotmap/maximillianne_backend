import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";

export type DbClient = typeof prisma | Prisma.TransactionClient;

export const findBlockedDateById = (id: string, db: DbClient = prisma) =>
  db.blockedDate.findUnique({ where: { id } });

export const findFirstOverlappingBlock = (
  start: Date,
  end: Date,
  db: DbClient = prisma,
) =>
  db.blockedDate.findFirst({
    where: {
      startDate: { lt: end },
      endDate: { gt: start },
    },
    select: { id: true, reason: true },
  });

export const findBlockedDateList = (
  page: number,
  limit: number,
  db: DbClient = prisma,
) =>
  db.blockedDate.findMany({
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

export const countBlockedDates = (db: DbClient = prisma) =>
  db.blockedDate.count();

export const findOverlappingBlocks = (
  start: Date,
  end: Date,
  db: DbClient = prisma,
) =>
  db.blockedDate.findMany({
    where: {
      startDate: { lt: end },
      endDate: { gt: start },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      reason: true,
    },
  });

export const createBlockedDate = (
  data: Prisma.BlockedDateCreateInput,
  db: DbClient = prisma,
) => db.blockedDate.create({ data });

export const deleteBlockedDateById = (id: string, db: DbClient = prisma) =>
  db.blockedDate.delete({ where: { id } });
