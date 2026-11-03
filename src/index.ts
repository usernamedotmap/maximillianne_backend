import express from "express";
import cors from "cors";
import { ENV } from "./config/env.js";
import { connectDb } from "./config/db.js";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.route.js";
import { errorHandler } from "./errors/errorHandler.js";
// import testRoute from "./test/routes/test.route.js";
import publicRoute from "./modules/public/public.route.js";
import adminRoutes from "./modules/admin/admin.route.js";
import { startBookingExpiryWorker } from "./modules/booking/booking-expiry.service.js";

const app = express();
const BASE_PATH = ENV.BASE_PATH;
const PORT = ENV.PORT;
const ORIGIN = ENV.ORIGIN;

if (!ORIGIN) {
  throw new Error("ORIGIN must be configured with the frontend origin for credentialed CORS.");
}

app.use(
  cors({
    origin: ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json());
app.use(cookieParser());

// ------- admin ---------//
app.use(`${BASE_PATH}/admin`, adminRoutes);

// -------- auth ---------//
app.use(`${BASE_PATH}/auth`, authRoutes);

// ------- public api --------- //
app.use(`${BASE_PATH}`, publicRoute);

// app.use(testRoute);

app.use("/api/health", (req, res) => {
  const path = req.path;
  res.status(200).json({
    status: "ok",
    path,
    message: "Server is running",
  });
});

app.use(errorHandler);

app.listen(PORT, async () => {
  connectDb();
  startBookingExpiryWorker();
  console.log(`Server running in PORT ${PORT}`);
});
