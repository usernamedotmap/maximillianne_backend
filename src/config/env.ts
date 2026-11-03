import "dotenv/config";

function env(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required ENV ${key}`);
  }

  return value;
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  ORIGIN: process.env.ORIGIN,
  BASE_PATH: process.env.BASE_PATH,
  PORT: process.env.PORT,

  JWT_ACCESS_SECRET: env("JWT_ACCESS_SECRET"),
  JWT_ACCESS_EXPIRES: env("JWT_ACCESS_EXPIRES"),

  ACCESS_TOKEN_COOKIE_MAX_AGE_MS: 15 * 60 * 1000,
  R2_ACCOUNT_ID: env("R2_ACCOUNT_ID"),
  R2_TOKEN_VALUE: env("R2_TOKEN_VALUE"),
  R2_ACCESS_KEY_ID: env("R2_ACCESS_KEY_ID"),
  R2_SECRET_ACCESS_KEY: env("R2_SECRET_ACCESS_KEY"),
  R2_BUCKET_NAME: env("R2_BUCKET_NAME"),
  R2_PUBLIC_DOMAIN: env("R2_PUBLIC_DOMAIN"),
};
