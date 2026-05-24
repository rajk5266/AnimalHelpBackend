import { Router, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { db } from "../db/db.js";
import { organization, userProfile, member } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { getPublicOrganizations } from "../controllers/organization.public.js";


const router = Router();

// ─── POST /api/organization/register ───────────────────────────
// Now open to everyone (Public Access)
router.post("/register", async (req: Request, res: Response) => {
  try {
    // Try to get a session if it exists, but DO NOT drop or block if it's missing
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    const { name, phone, address, website, description, latitude, longitude } = req.body;

    if (!name) return res.status(400).json({ error: "Organization name is required" });

    // Enforce one-org constraint ONLY if the user is actively logged in
    if (session?.user?.id) {
      const existingOwnership = await db.query.member.findFirst({
        where: and(
          eq(member.userId, session.user.id),
          eq(member.role, "owner")
        ),
      });
      if (existingOwnership) {
        return res.status(409).json({ error: "You already have a registered organization" });
      }
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Generate a clean random unique string ID for the raw insert
    const uniqueOrgId = `org_${Math.random().toString(36).substring(2, 11)}`;

    // Direct DB Insertion bypasses Better Auth's session constraint rules completely
    const [newOrg] = await db
      .insert(organization)
      .values({
        id: uniqueOrgId,
        name,
        slug,
        phone,
        address,
        website,
        description,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        verificationStatus: "pending",
        verified: false,
        createdAt: new Date(),
        // Pass submitted timestamp into metadata safely using the schema representation
        metadata: JSON.stringify({ submittedAt: new Date().toISOString() }),
      })
      .returning();

    // If an authenticated user submitted this, link them up as the owner in the member table
    if (session?.user?.id) {
      await db.insert(member).values({
        id: `mem_${Math.random().toString(36).substring(2, 11)}`,
        organizationId: newOrg.id,
        userId: session.user.id,
        role: "owner",
        createdAt: new Date(),
      });
    }

    return res.status(201).json({
      message: "Organization submitted for review successfully",
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        verificationStatus: "pending",
      },
    });
  } catch (err: any) {
    console.error("Organization register error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/organization/me ──────────────────────────────────
// Keeps the auth lock active so users can look up their own connected profile data
router.get("/me", async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const result = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        metadata: organization.metadata,
        phone: organization.phone,
        address: organization.address,
        website: organization.website,
        description: organization.description,
        latitude: organization.latitude,
        longitude: organization.longitude,
        verified: organization.verified,
        verificationStatus: organization.verificationStatus,
        verifiedAt: organization.verifiedAt,
        rejectedReason: organization.rejectedReason,
        createdAt: organization.createdAt,
      })
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.role, "owner")
        )
      )
      .leftJoin(organization, eq(member.organizationId, organization.id))
      .limit(1);

    const myNgo = result[0];

    if (!myNgo || !myNgo.id) {
      return res.status(404).json({ error: "No organization found" });
    }

    return res.json({
      ...myNgo,
      ownerId: session.user.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/organization/admin/pending ───────────────────────
router.get("/admin/pending", async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const profile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, session.user.id),
    });

    if (!profile || !["admin", "superadmin"].includes(profile.role ?? "")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const pending = await db.query.organization.findMany({
      where: eq(organization.verificationStatus, "pending"),
    });

    return res.json(pending);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/organization/admin/:orgId/verify ──────────────
router.patch("/admin/:orgId/verify", async (req: Request<{ orgId: string }>, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const profile = await db.query.userProfile.findFirst({
      where: eq(userProfile.userId, session.user.id),
    });

    if (!profile || !["admin", "superadmin"].includes(profile.role ?? "")) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { action, rejectedReason } = req.body as {
      action: "approve" | "reject";
      rejectedReason?: string;
    };

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    }

    await db
      .update(organization)
      .set({
        verified: action === "approve",
        verificationStatus: action === "approve" ? "verified" : "rejected",
        verifiedAt: action === "approve" ? new Date() : null,
        rejectedReason: action === "reject" ? (rejectedReason ?? null) : null,
      })
      .where(eq(organization.id, req.params.orgId));

    return res.json({
      message: action === "approve" ? "Organization verified" : "Organization rejected",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PUBLIC LISTING SEARCH DISCOVERY ROUTE ─────────────
// Open route — No session checks or requireVerifiedOrg middleware needed!
router.get("/", getPublicOrganizations);

// ... your secure endpoints remain down here ...
// router.post("/register", ...)
// router.get("/me", ...)

export default router;
