import prisma from "../../../lib/prisma.js";

export const findUnique = async (id: number) => {
  return prisma.propertySettings.findUnique({
    where: {
      id,
    },
  });
};



