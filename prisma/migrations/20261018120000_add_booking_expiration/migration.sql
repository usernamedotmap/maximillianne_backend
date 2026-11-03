-- Add an optional deadline for pending booking holds.
ALTER TABLE "bookings"
ADD COLUMN "expires_at" TIMESTAMPTZ;

-- Give existing pending bookings the same 24-hour hold duration as new ones.
UPDATE "bookings"
SET "expires_at" = "created_at" + INTERVAL '24 hours'
WHERE "status" = 'pending';

CREATE INDEX "bookings_status_expires_at_idx"
ON "bookings"("status", "expires_at");
