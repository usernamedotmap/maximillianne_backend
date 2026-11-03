ALTER TABLE "bookings"
ADD COLUMN "tracking_reference" UUID;

UPDATE "bookings"
SET "tracking_reference" = gen_random_uuid()
WHERE "tracking_reference" IS NULL;

ALTER TABLE "bookings"
ALTER COLUMN "tracking_reference" SET NOT NULL;

CREATE UNIQUE INDEX "bookings_tracking_reference_key"
ON "bookings"("tracking_reference");
