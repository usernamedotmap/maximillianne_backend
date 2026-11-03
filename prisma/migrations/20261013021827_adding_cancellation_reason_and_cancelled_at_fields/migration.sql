-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");
