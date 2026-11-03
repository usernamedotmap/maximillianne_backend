import path from "path";
import { Prisma } from "@prisma/client";
import { Errors } from "../../errors/appError.js";
import * as bookingRepository from "../booking/booking.repository.js";
import * as paymentRepository from "../payment/payment.repository.js";
import {
  getPresignedProofViewUrl,
  uploadPaymentProofToR2,
} from "../../lib/r2.js";
import prisma from "../../lib/prisma.js";
import { DEFAULT_PROPERTY_ID } from "../../config/property.js";
export interface SubmitPaymentProofInput {
  id: string;
  file: Express.Multer.File;
  amountStr?: string;
  propertyId?: number;
}

export const verifyPaymentService = async (paymentId: string) => {
  const payment = await paymentRepository.findPaymentById(paymentId);

  if (!payment) {
    throw Errors.notFound("Payment");
  }

  if (payment.verified) {
    throw Errors.conflict("This payment has already been verified.");
  }

  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      verified: true,
      verifiedAt: new Date(),
    },
  });
};

export const submitPaymentProofService = async (
  input: SubmitPaymentProofInput,
) => {
  const { id: requestedBookingId, file, amountStr } = input;
  const propertyId = input.propertyId ?? DEFAULT_PROPERTY_ID;
  const booking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    const current =
      (await bookingRepository.findBookingByTrackingReference(
        requestedBookingId,
        tx,
      )) ??
      (await bookingRepository.findBookingId(requestedBookingId, tx));
    if (!current) throw Errors.notFound("Booking");
    if (current.status !== "pending" || !current.expiresAt || current.expiresAt <= new Date()) {
      throw Errors.badRequest(
        current.status === "pending"
          ? "This booking hold has expired; payment proof can no longer be submitted."
          : `Cannot submit payment proof for a booking with status '${current.status}'. Only active pending bookings accept payment proof.`,
      );
    }
    if (current.payment.some((payment) => payment.verified)) {
      throw Errors.conflict("Payment has already been verified for this booking.");
    }
    return current;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  const bookingId = booking.id;

  let paymentAmount: number;
  if (amountStr && !isNaN(Number(amountStr)) && Number(amountStr) > 0) {
    paymentAmount = Number(amountStr);
  } else {
    paymentAmount = Math.round(Number(booking.totalAmount) * 0.5);
  }

  const extension =
    path.extname(file.originalname).replace(".", "").toLowerCase() || "png";
  const proofFileKey = `proofs/${bookingId}/${Date.now()}.${extension}`;

  await uploadPaymentProofToR2(proofFileKey, file.buffer, file.mimetype);

  const paymentRecord = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Revalidate under the same lock after the external upload; it may have crossed expiry.
    await bookingRepository.lockPropertyAvailability(propertyId, tx);
    const current = await bookingRepository.findBookingId(bookingId, tx);
    if (!current) throw Errors.notFound("Booking");
    if (current.status !== "pending" || !current.expiresAt || current.expiresAt <= new Date()) {
      throw Errors.badRequest("This booking is no longer an active pending hold; payment proof was not saved.");
    }
    if (current.payment.some((payment) => payment.verified)) {
      throw Errors.conflict("Payment has already been verified for this booking.");
    }

    const existingPendingPayment = await paymentRepository.findPendingPaymentByBookingId(bookingId, "downpayment", tx);
    if (existingPendingPayment) {
      return paymentRepository.updatePaymentProof(existingPendingPayment.id, {
        proofFileKey,
        amount: paymentAmount,
      }, tx);
    }
    return paymentRepository.createPayment({
      bookingId,
      type: "downpayment",
      amount: paymentAmount,
      proofFileKey,
      verified: false,
    }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

  return {
    payment: {
      id: paymentRecord.id,
      bookingId: paymentRecord.bookingId,
      type: paymentRecord.type,
      amount: paymentRecord.amount,
      proofFileKey: paymentRecord.proofFileKey,
      verified: paymentRecord.verified,
      createdAt: paymentRecord.createdAt,
    },
    booking: {
      id: booking.id,
      status: booking.status,
      totalAmount: booking.totalAmount,
    },
  };
};

export const getPaymentProofUrlService = async (paymentId: string) => {
  const payment = await paymentRepository.findPaymentById(paymentId);
  if (!payment) {
    throw Errors.notFound("Payment");
  }

  if (!payment.proofFileKey) {
    throw Errors.badRequest(
      "No payment proof screenshots found for this payment record.",
    );
  }

  const expiresInSeconds = 900;
  const url = await getPresignedProofViewUrl(
    payment.proofFileKey,
    expiresInSeconds,
  );

  return {
    url,
    paymentId: payment.id,
    expiresInSeconds,
  };
};
