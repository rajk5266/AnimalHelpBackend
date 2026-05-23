// src/routes/ngo.ts
import { Router } from "express";
import { auth } from "../lib/auth.js";
import { db } from "../db/db.js";
import { organization } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

const router = Router();

router.post("/register", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { name, phone, address, website, description, latitude, longitude } = req.body;

  // check one-org-per-user
  const existing = await db.query.organization.findFirst({
    where: eq(organization.ownerId, session.user.id),
  });

  if (existing) {
    return res.status(409).json({ error: "You already have an organization" });
  }

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // create via Better Auth (handles members, roles, etc.)
  const org = await auth.api.createOrganization({
    headers: fromNodeHeaders(req.headers),
    body: {
      name,
      slug,
      userId: session.user.id,
      metadata: { status: "pending" },
    },
  });

  // patch your extra fields
  await db
    .update(organization)
    .set({ phone, address, website, description, latitude, longitude, ownerId: session.user.id })
    .where(eq(organization.id, org.id));

  return res.status(201).json({ message: "NGO submitted for review", orgId: org.id });
});

export default router;