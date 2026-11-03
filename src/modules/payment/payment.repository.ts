import { PaymentType, Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";

export type DbClient = typeof prisma | Prisma.TransactionClient;

export const findPaymentById = (id: string, db: DbClient = prisma) =>
  db.payment.findUnique({
    where: {
      id,
    },
    include: {
      booking: true,
    },
  });

export const findPendingPaymentByBookingId = (
  bookingId: string,
  type: PaymentType = "downpayment",
  db: DbClient = prisma,
) =>
  db.payment.findFirst({
    where: {
      bookingId,
      type,
      verified: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

export const createPayment = (
  data: {
    bookingId: string;
    type: PaymentType;
    amount: Prisma.Decimal | number;
    proofFileKey: string;
    verified?: boolean;
  },
  db: DbClient = prisma,
) =>
  db.payment.create({
    data: {
      bookingId: data.bookingId,
      type: data.type,
      amount: new Prisma.Decimal(data.amount),
      proofFileKey: data.proofFileKey,
      verified: data.verified ?? false,
    },
  });

export const updatePaymentProof = (
  id: string,
  data: {
    proofFileKey: string;
    amount?: Prisma.Decimal | number;
  },
  db: DbClient = prisma,
) =>
  db.payment.update({
    where: {
      id,
    },
    data: {
      proofFileKey: data.proofFileKey,
      ...(data.amount ? { amount: new Prisma.Decimal(data.amount) } : {}),
      verified: false,
    },
  });
