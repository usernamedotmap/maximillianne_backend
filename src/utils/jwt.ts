import jwt, { SignOptions } from "jsonwebtoken";
import { ENV } from "../config/env.js";

export interface AccessJwtPayload {
  id: string;
}

export const signAccessToken = (id: string): string => {
  const payload: AccessJwtPayload = { id };

  const options: SignOptions = {
    expiresIn: ENV.JWT_ACCESS_EXPIRES as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, options);
};




// verify token here
export const verifyAccessToken = (token: string): AccessJwtPayload => 
  jwt.verify(token, ENV.JWT_ACCESS_SECRET) as AccessJwtPayload; 