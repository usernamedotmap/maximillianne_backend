import { Request, Response } from "express";
import { getPropertyService } from "./property.service.js";

export const getPropertyController = async (_req: Request, res: Response) => {
  const property = await getPropertyService();

  res.status(200).json({
    message: "Property retrieved successfully",
    property,
  });
};
