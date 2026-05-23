// src/middlewares/requireVerifiedOrg.ts
import { auth } from "../lib/auth.js";
import { db } from "../db/db.js";
import { organization } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { toWebHeaders } from "../utils/headers.js";
import { Request, Response, NextFunction } from "express";

export async function requireVerifiedOrg(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: toWebHeaders(req.headers),
  });

  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const org = await db.query.organization.findFirst({
    where: eq(organization.ownerId, session.user.id),
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