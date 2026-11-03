# Maximilliane's Haven backend — current implementation review

Reviewed: 26 September 2026

## What exists today

This is an Express + TypeScript + Prisma/PostgreSQL backend for a **single rental property**.

The data model already covers the core concepts:

- `PropertySettings`: one property record (expected at ID `1`), nightly rate, capacity, and check-in/out times.
- `Guest`: guest contact details.
- `Booking`: stay dates, guest count, price snapshot, notes, and a booking status.
- `Payment`: down-payment/full-payment records and verification fields.
- `BlockedDate`: owner-unavailable date ranges.
- `AdminUser`: email/password credentials.

The seed script creates the property and one admin account. Passwords are hashed with bcrypt.

## Current request flow

```text
Client
  -> GET {BASE_PATH}/property/
  -> property controller
  -> property service
  -> Prisma: PropertySettings.findUnique({ id: 1 })
  -> property JSON response
```

`POST {BASE_PATH}/bookings/` and `GET {BASE_PATH}/calendar/` are registered, but their handlers/services are not implemented yet. They therefore do not currently provide booking or availability functionality.

## Good foundations already in place

- Clear module split for property, booking, and calendar.
- Prisma schema and migrations define the main business entities and useful date/status indexes.
- Booking stores the nightly rate and total at booking time, which preserves price history.
- Payment verification is modeled separately from booking status.
- Environment values are required before startup.
- Database connection retries are present.

## Highest-priority improvements

### 1. Complete the booking flow safely

Implement a booking creation service inside a database transaction:

1. Validate request data.
2. Read the current property settings.
3. Check that the requested stay overlaps neither a blocked period nor an active booking.
4. Calculate nights and `totalAmount` on the server; never accept a client-supplied total or nightly rate.
5. Create/find the guest and create a `pending` booking atomically.

Important: availability must be protected against concurrent requests. An application-level “check then insert” alone can double-book. Use a transaction with appropriate locking/serializable isolation, or preferably a PostgreSQL date-range exclusion constraint for active bookings.

### 2. Add request validation (Zod is already installed)

Validate every body, path, and query input before the controller calls a service. At minimum:

- `fullName`: trimmed, non-empty, maximum 100 characters.
- `phone`: normalized and validated to the chosen supported format; maximum 20 characters.
- `email`: optional but valid and normalized when supplied.
- `checkIn` / `checkOut`: strict `YYYY-MM-DD` dates in the property timezone.
- `guestCount`: positive integer and no greater than `PropertySettings.maxGuests`.
- `notes`: optional, trimmed, with an explicit maximum length.
- IDs: UUID validation.
- Monetary/payment values: positive decimal values represented safely (not JavaScript floating point).

Return consistent `400` validation responses without leaking internal error details.

### 3. Define and enforce booking rules

The application needs explicit policy decisions, then server-side enforcement. Recommended baseline:

- A booking must have `checkOut > checkIn` and at least one night.
- Check-in cannot be in the past (define the timezone and cutoff time).
- A night is unavailable when `existing.checkIn < requested.checkOut AND existing.checkOut > requested.checkIn`.
- Treat `pending` reservations as holding dates only for a configured expiry period; otherwise expire them automatically. Approved bookings always block dates.
- Blocked-date ranges must have `endDate >= startDate`; decide whether the end date is inclusive and apply that convention consistently.
- Only allowed status transitions should occur, e.g. `pending -> approved/rejected/cancelled/expired`; do not allow arbitrary updates.
- A booking can be approved only after the required payment has been verified (define deposit amount and due date).
- Payment totals must not exceed the booking total; prevent duplicate verified payments of the same type unless intentional.
- Property price/capacity changes affect new bookings only; existing booking price snapshots remain unchanged.

### 4. Build calendar and admin operations

The calendar endpoint should return a defined date range and classify dates as available, held, booked, or blocked. Validate a bounded date range to avoid expensive unbounded queries.

Admin-only endpoints are still needed for login, listing/filtering bookings, approving/rejecting/cancelling bookings, verifying payments, editing property settings, and managing blocked dates.

### 5. Add authentication and authorization

Although `AdminUser`, JWT packages, and cookie-parser are present, there is no authentication flow or route protection yet. Add:

- Login with bcrypt comparison and rate limiting.
- JWT/session issuance using real `JWT_SECRET` and expiry values from the environment.
- Authentication middleware and admin authorization on all management routes.
- Secure, `httpOnly`, `sameSite`, and production `secure` cookies if using cookie-based tokens.
- Never return password hashes in API responses.

## Reliability and security gaps

- No global error middleware: a thrown service error may produce inconsistent/default Express behavior. Add typed application errors plus a final error handler that maps validation, not-found, conflict, and unexpected errors to safe JSON responses.
- No `404` fallback or async-controller error wrapper.
- `helmet`, `cors`, `express-rate-limit`, `jsonwebtoken`, `cookie-parser`, and `zod` are installed but not configured/used. Configure them or remove unused dependencies.
- `express.json()` has no payload-size limit. Set a small appropriate limit.
- CORS origin(s) should be explicitly allowlisted, especially if cookies are used.
- The seed script contains and prints a fixed administrator password. Move seed credentials to environment variables, do not print passwords, and prevent this development account from being used in production.
- `ENV.JWT_SECRET` and `ENV.JWT_EXPIRES` are currently literal strings rather than calls to `env(...)`; a future auth feature would silently use incorrect values.
- Start listening only after the database is successfully connected, and add graceful shutdown (`SIGTERM`/`SIGINT`) to disconnect Prisma.

## Data-model improvements

- Rename `Booking.totalMount` / database `total_mount` to `totalAmount` / `total_amount`. This is a typo that will otherwise spread through API and reporting code; make it a deliberate migration before the system has real data.
- Add database constraints for positive `guest_count`, non-negative rates/amounts, valid date ordering, and valid property capacity/time values. Validation belongs in the API **and** the database.
- Add a unique or intentional deduplication strategy for guests (for example a normalized phone number and/or email); currently repeat submissions can create duplicate guest records.
- Consider `PaymentStatus`/verification audit fields (`verifiedByAdminId`, rejection reason) instead of only a boolean, so payment review is traceable.
- Decide whether deleting guests/bookings should cascade. For booking systems, preserving records and using status changes is usually safer for audit/history than cascading deletion.
- Add a business identifier / confirmation code to bookings for customer/admin communication.
- Add `updatedAt` to entities that staff can edit, especially payments and blocked dates.

## API and testing recommendations

- Version/document the API (for example `/api/v1`) and publish endpoint contracts, status codes, and error shapes.
- Use a consistent response envelope or return resources consistently; avoid mixing ad-hoc shapes.
- Add unit tests for pricing, date-overlap, status transitions, and validation.
- Add integration tests for booking creation, blocked dates, concurrent booking attempts, authorization, and error responses.
- Add structured logging with request IDs; avoid logging credentials, tokens, payment proofs, or personal data.

## Build status at review time

`npm.cmd run build` currently fails because `noUnusedLocals`/`noUnusedParameters` is enabled:

- `src/index.ts`: unused `req` in the health endpoint.
- `src/modules/property/property.controller.ts`: unused `req`.
- `src/seeders/seed.ts`: unused `propertySettings` variable.

Resolve those before treating the backend as build-ready. The project folder is not currently a Git working tree, so no source-control status was available during this review.

## Suggested implementation order

1. Fix the TypeScript build and add central error handling/security middleware.
2. Define the booking, payment, cancellation, and pending-expiry policies in writing.
3. Add Zod schemas and implement transactional booking creation with database-level overlap protection.
4. Implement calendar availability and the admin authentication/management endpoints.
5. Add integration tests, then add payment-proof storage/verification and operational logging.
