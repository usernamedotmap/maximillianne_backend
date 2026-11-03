import { Request, Response } from "express";
import { BookingIdParams } from "../../validation/booking.validation.js";
import * as paymentService from "../payment/payment.service.js";
import { HttpStatus } from "../../errors/http-status.js";
import { DEFAULT_PROPERTY_ID } from "../../config/property.js";

export const submitPaymentProof = async (req: Request, res: Response) => {
  const { id } = BookingIdParams.parse(req.params);
  const file = req.file!;
  const amountStr = req.body?.amount ? String(req.body.amount) : undefined;
  console.log("this payment", amountStr);
  const { payment, booking } = await paymentService.submitPaymentProofService({
    id,
    file,
    amountStr,
    propertyId: DEFAULT_PROPERTY_ID,
  });

  res.status(HttpStatus.CREATED).json({
    message: "Payment proof upload successfully. Awaiting host verification",
    payment,
    booking,
  });
};

export const submitPublicPaymentProof = async (
  req: Request,
  res: Response,
) => {
  const { id } = BookingIdParams.parse(req.params);
  const file = req.file!;

  const { booking } = await paymentService.submitPaymentProofService({
      id,
      file,
      propertyId: DEFAULT_PROPERTY_ID,
    });

  res.status(HttpStatus.CREATED).json({
    message: "Payment proof uploaded successfully. Awaiting host verification.",
    booking: { status: booking.status },
  });
};

export const getPaymentProofUrl = async (req: Request, res: Response) => {
  const paymentId = req.params.id;

  const payment = await paymentService.getPaymentProofUrlService(paymentId);

  res.status(HttpStatus.OK).json({
    message: "Payment retrieve successfully",
    payment,
  });
};

export const verifyPayment = async (req: Request, res: Response) => {
  const paymentId = req.params.id;

  const payment = await paymentService.verifyPaymentService(paymentId);

  res.status(HttpStatus.OK).json({
    message: "Verify payment successfully",
    payment,
  });
};
