import { Router } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { authenticate } from "../../../middleware/authenticate.js";
import { getPaymentProofUrl, submitPaymentProof, verifyPayment } from "../../payment/payment.controller.js";
import { uploadPaymentProof } from "../../../middleware/upload.js";

const paymentRoute = Router();

paymentRoute.use(authenticate);
paymentRoute.get("/:id/proof-url", asyncHandler(getPaymentProofUrl));
paymentRoute.patch("/:id/verify", asyncHandler(verifyPayment))
paymentRoute.post("/:id/payment-proof", uploadPaymentProof, asyncHandler(submitPaymentProof));

export default paymentRoute;
