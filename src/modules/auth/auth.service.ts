import { Errors } from "../../errors/appError.js";
import { userResponse } from "../../mappers/user.mapper.js";
import { comparedPassword } from "../../utils/hash.js";
import { signAccessToken } from "../../utils/jwt.js";
import { LoginInput } from "../../validation/auth.validation.js";
import * as authRepository from "./auth.repository.js";

export const loginService = async (input: LoginInput) => {
  const { email, password } = input;

  const user = await authRepository.findByEmail(email);

  if (!user) throw Errors.invalidCredentials();

  const isMatch = await comparedPassword(password, user.password);

  if (!isMatch) throw  Errors.invalidCredentials();

  const accessToken = signAccessToken(user.id);

  

  return {
    user: {
      ...userResponse(user),
    },
    token: accessToken,
  };
};

export const getMe = async (id: string) => {
  const user = await authRepository.findById(id);

  if (!user) throw Errors.invalidCredentials();

  return {
    ...userResponse(user)
  }
}


