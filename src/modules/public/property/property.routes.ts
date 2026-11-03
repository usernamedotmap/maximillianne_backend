import { Router } from "express";
import { getPropertyController } from "./property.controller.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";



const propertyRoutes = Router();


propertyRoutes.get("/", asyncHandler(getPropertyController));

export default propertyRoutes;