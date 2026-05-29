// src/middlewares/requireVerifiedOrg.ts
import { auth } from "../lib/auth.js";
import { db } from "../db/db.js";
import { organization } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { Request, Response, NextFunction } from "express";

/**
 * Express middleware that ensures:
 * 1. The user has a valid session
 * 2. The session has an activeOrganizationId set
 * 3. That organization exists and is verified
 *
 * Uses Better Auth's session.activeOrganizationId instead of
 * querying by a denormalized ownerId field.
 */
export async function requireVerifiedOrg(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) return res.status(401).json({ error: "Unauthorized" });

  // Use Better Auth's active organization concept
  const activeOrgId = session.session.activeOrganizationId;

  if (!activeOrgId) {
    return res.status(403).json({ error: "No active organization selected" });
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, activeOrgId),
  });

  if (!org) return res.status(404).json({ error: "Organization not found" });

  if (!org.verified) {
    return res.status(403).json({
      error: org.verificationStatus === "rejected"
        ? `Organization rejected${org.rejectedReason ? `: ${org.rejectedReason}` : ""}`
        : "Organization pending verification",
    });
  }

  (req as any).org = org; // attach so handlers don't re-query
  next();
}