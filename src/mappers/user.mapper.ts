import { AdminUser } from "@prisma/client";

export type UserResponse = Omit<AdminUser, "password">;

export const userResponse = (user: AdminUser): UserResponse => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
