import { auth } from "../lib/auth.js";
import type { Request } from "express";

export const createOrganizationService = async (req: Request) => {
  const { name, slug, phone, address, latitude, longitude } = req.body;

  const result = await auth.api.createOrganization({
    body: {
      name,
      slug,
      phone,
      address,
      latitude,
      longitude,
    },
    headers: req.headers as any,
  });

  // 🔥 Set active org immediately
  await auth.api.setActiveOrganization({
    body: {
      organizationId: result.id,
    },
    headers: req.headers as any,
  });

  return result;
};

export const getMyOrganizationsService = async (req: Request) => {
  return await auth.api.listOrganizations({
    headers: req.headers as any,
  });
};

export const setActiveOrganizationService = async (req: Request) => {
  const { organizationId } = req.body;

  return await auth.api.setActiveOrganization({
    body: { organizationId },
    headers: req.headers as any,
  });
};