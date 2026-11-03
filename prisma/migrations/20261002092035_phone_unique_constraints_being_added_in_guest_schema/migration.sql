/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `guests` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "guests_phone_key" ON "guests"("phone");
