/*
  Warnings:

  - The primary key for the `admin_users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `email` on the `admin_users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `password` on the `admin_users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The primary key for the `guests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `full_name` on the `guests` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `phone` on the `guests` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `email` on the `guests` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - Changed the type of `id` on the `admin_users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `guests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('downpayment', 'full_payment');

-- AlterTable
ALTER TABLE "admin_users" DROP CONSTRAINT "admin_users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "password" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ,
ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "guests" DROP CONSTRAINT "guests_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "full_name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ,
ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "blocked_date" (
    "id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_date_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "guest_count" SMALLINT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "nightly_rate" DECIMAL(10,2) NOT NULL,
    "total_mount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "proof_file_key" VARCHAR(255),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(100) NOT NULL DEFAULT 'Maximilliane''s Haven',
    "description" TEXT,
    "nightly_rate" DECIMAL(10,2) NOT NULL DEFAULT 2500.00,
    "max_guests" SMALLINT NOT NULL DEFAULT 4,
    "check_in_time" VARCHAR(10) NOT NULL DEFAULT '14:00',
    "check_out_time" VARCHAR(10) NOT NULL DEFAULT '12:00',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "property_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocked_date_start_date_end_date_idx" ON "blocked_date"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "bookings_check_in_check_out_idx" ON "bookings"("check_in", "check_out");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
