import { Router } from "express";
import { getMonthAvailabilityController } from "./calendar.controller.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

const calendarRoutes = Router();

calendarRoutes.get("/", asyncHandler(getMonthAvailabilityController));

export default calendarRoutes;