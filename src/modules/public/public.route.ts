import { Router } from "express";
import propertyRoutes from "./property/property.routes.js";
import calendarRoutes from "./calendar/calendar.route.js";
import bookingRoutes from "./bookings/booking.route.js";



const publicRoute = Router();

publicRoute.use("/properties" , propertyRoutes);
publicRoute.use("/calendars", calendarRoutes);
publicRoute.use("/bookings", bookingRoutes);


export default publicRoute;