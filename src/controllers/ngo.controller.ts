// @ts-nocheck
import { Request, Response } from "express";
import { db } from "../db/db.js";
import { organizationRequest } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

export const createNgoRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // 🔒 Auth check
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      name,
      phone,
      address,
      website,
      description,
      latitude,
      longitude,
      ngoId,
    } = req.body;

    // 🔒 Basic validation
    if (!name || !phone || !address || !ngoId) {
      return res.status(400).json({
        message: "Name, phone, address and NGO ID are required",
      });
    }

    // 🔒 1 NGO per user (already requested)
    const existingRequest = await db.query.organizationRequest.findFirst({
      where: (table, { eq }) => eq(table.userId, userId),
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "You already submitted an NGO request",
      });
    }

    //  Already owns an NGO
    // const existingOrg = await db.query.member.findFirst({
    //   where: (table, { eq, and }) =>
    //     and(eq(table.userId, userId), eq(table.role, "owner")),
    // });

    // if (existingOrg) {
    //   return res.status(400).json({
    //     message: "You already own an NGO",
    //   });
    // }

    // 🔒 Prevent duplicate NGO ID (important for real-world)
    const duplicateNgoId = await db.query.organizationRequest.findFirst({
      where: (table, { eq }) => eq(table.ngoId, ngoId),
    });

    if (duplicateNgoId) {
      return res.status(400).json({
        message: "This NGO ID is already registered",
      });
    }

    // ✅ Save request
    const [request] = await db
      .insert(organizationRequest)
      .values({
        userId,
        ngoId,
        name,
        phone,
        address,
        website,
        description,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        status: "pending",
      })
      .returning();

    return res.status(201).json({
      message: "NGO request submitted successfully",
      data: request,
    });
  } catch (err) {
    console.error("NGO REQUEST ERROR:", err);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};