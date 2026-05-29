


import { Request, Response } from "express";
import { db } from "../db/db.js";
import { organization } from "../db/schema.js";
import { eq, and, ilike, sql } from "drizzle-orm";

export const getPublicOrganizations = async (req: Request, res: Response) => {
  try {
    const { query, type, lat, lng, radius } = req.query;

    // 1. Base conditions: Only display verified, approved organizations to the public
    const conditions = [eq(organization.verificationStatus, "verified")];

    // Filter by string keyword match
    if (query) {
      conditions.push(ilike(organization.name, `%${String(query).trim()}%`));
    }

    // Filter by type (clinic, shelter, etc.)
    if (type && type !== "all") {
      //  Assert the string safely as one of the specific enum values
      conditions.push(
        eq(
          organization.type,
          String(type) as "ngo" | "clinic" | "shelter" | "rescue_center"
        )
      );
    }

    // 2. Setup Geospatial Selection if coordinates exist
    if (lat && lng) {
      const userLat = parseFloat(String(lat));
      const userLng = parseFloat(String(lng));
      const maxDistance = parseFloat(String(radius || "15")); // default 15km boundary

      /**
       * Haversine Formula implemented via raw PostgreSQL blocks.
       * Calculates distance in kilometers between two sets of coordinate floats.
       * 6371 is the Earth's radius in kilometers.
       */
      const distanceSql = sql<number>`
        6371 * acos(
          cos(radians(${userLat})) * cos(radians(${organization.latitude})) * cos(radians(${organization.longitude}) - radians(${userLng})) + 
          sin(radians(${userLat})) * sin(radians(${organization.latitude}))
        )
      `;

      // Fetch rows, calculate dynamic distance field, and filter results by radius boundary
      const results = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          type: organization.type, // 👈 Make sure to pull the new type field here
          logo: organization.logo,
          phone: organization.phone,
          address: organization.address,
          website: organization.website,
          description: organization.description,
          latitude: organization.latitude,
          longitude: organization.longitude,
          verificationStatus: organization.verificationStatus,
          createdAt: organization.createdAt,
          distanceKm: distanceSql,
        })
        .from(organization)
        .where(and(...conditions, sql`${distanceSql} <= ${maxDistance}`))
        .orderBy(distanceSql);

      return res.json(results);
    }

    // 3. Fallback: If no location provided, return matching verified rows sorted alphabetically
    const standardResults = await db
      .select()
      .from(organization)
      .where(and(...conditions))
      .orderBy(organization.name);

    return res.json(standardResults);
  } catch (err: any) {
    console.error("Public fetch organization query failure:", err);
    return res.status(500).json({ error: "Internal Server Error during data lookup." });
  }
};