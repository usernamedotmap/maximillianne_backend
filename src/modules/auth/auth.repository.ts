import prisma from "../../lib/prisma.js";

export const findByEmail = async (email: string) => {
  return await prisma.adminUser.findUnique({
    where: {
      email,
    },
  });
};

export const findById = async (id: string) => {
  return await prisma.adminUser.findUnique({
    where: {
      id
    }
  })
}
