import { Response } from "express";
import { CookieOptions } from "express";
import { ENV } from "../config/env.js";

export const getCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: ENV.NODE_ENV === "production",
  sameSite: ENV.NODE_ENV === "production" ?  "none" : "lax" as const ,
  path: "/",
});

export const setAuthCookies = (res: Response, accessToken: string): void => {
  const options = getCookieOptions();

  res.cookie("accessToken", accessToken, {
    ...options,
    maxAge: ENV.ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
  });
};

export const clearAuthCookies = (res: Response): void => {
  const options = getCookieOptions();

  res.clearCookie("accessToken", {
    ...options,
  });
};
