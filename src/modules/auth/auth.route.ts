import { Router } from "express";
import { getMeController, loginController, logoutcontroller } from "./auth.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";


const authRoutes = Router();

authRoutes.post("/login", asyncHandler(loginController));
authRoutes.get("/me", authenticate, asyncHandler(getMeController));
authRoutes.post("/logout", asyncHandler(logoutcontroller));
 
export default authRoutes;