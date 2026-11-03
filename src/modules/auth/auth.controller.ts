import { Request, Response } from "express";
import { loginSchema } from "../../validation/auth.validation.js";
import * as authService from "./auth.service.js";
import { clearAuthCookies, setAuthCookies } from "../../utils/cookie.js";
import { HttpStatus } from "../../errors/http-status.js";

export const loginController = async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const { user, token } = await authService.loginService(body);

  setAuthCookies(res, token);

  res.status(HttpStatus.OK).json({
    message: "Login successful",
    user,
  });
};

export const getMeController = async (req: Request, res: Response) => {

  const userId = req.user!.id

  const user = await authService.getMe(userId);


  res.status(HttpStatus.OK).json({
    message: "Verify authenticate success",
    user,
  });
};

export const logoutcontroller = async (req: Request, res: Response) => {
  clearAuthCookies(res);

  res.status(HttpStatus.OK).json({
    message: "Logout successfully",
  });
};
