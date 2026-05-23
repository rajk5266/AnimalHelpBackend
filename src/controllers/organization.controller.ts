import {
  createOrganizationService,
  getMyOrganizationsService,
  setActiveOrganizationService,
} from "../services/organization.service.js";
import type { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";

export const createOrganizationController = catchAsync(async (req: Request, res: Response) => {
  const data = await createOrganizationService(req);
  res.json(data);
});

export const getMyOrganizationsController = catchAsync(async (req: Request, res: Response) => {
  const data = await getMyOrganizationsService(req);
  res.json(data);
});

export const setActiveOrganizationController = catchAsync(async (req: Request, res: Response) => {
  const data = await setActiveOrganizationService(req);
  res.json(data);
});