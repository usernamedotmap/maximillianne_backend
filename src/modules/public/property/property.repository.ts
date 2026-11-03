import prisma from "../../../lib/prisma.js";

export const findById = async (id: number) => {
  return prisma.propertySettings.findUnique({
    where: {
      id,
    },
  });
};



