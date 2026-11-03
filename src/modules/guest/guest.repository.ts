import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";

export type DbClient = typeof prisma | Prisma.TransactionClient;

export interface UpsertGuestInput {
  fullName: string;
  phone: string;
  email?: string | null;
}

export const upsertGuest = async (
  data: Prisma.GuestCreateInput,
  db: DbClient = prisma,
) => {
  return db.guest.upsert({
    where: { phone: data.phone },
    update: {},
    create: data,
  });
};
