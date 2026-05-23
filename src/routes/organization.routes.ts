import { Router, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { db } from "../db/db.js";
import { organization, userProfile } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { requireVerifiedOrg } from "../middlewares/requireVerifiedOrg.js";

const router = Router();

// ─── POST /api/ngos/register ───────────────────────────
// Creates org via Better Auth then patches extra fields
router.post("/register", async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const { name, phone, address, website, description, latitude, longitude } = req.body;

    if (!name) return res.status(400).json({ error: "NGO name is required" });

    // Check one-org-per-user before hitting Better Auth
    const existing = await db.query.organization.findFirst({
      where: eq(organization.ownerId, session.user.id),
    });
    if (existing) {
      return res.status(409).json({ error: "You already have a registered organization" });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Create via Better Auth — hooks will set ownerId, verified: false, verificationStatus: pending
    const org = await auth.api.createOrganization({
      headers: fromNodeHeaders(req.headers),
      body: {
        name,
        slug,
        metadata: { submittedAt: new Date().toISOString() },
        // extra fields passed through additionalFields
        phone,
        address,
        website,
        description,
        latitude,
        longitude,
      },
    });

    return res.status(201).json({
      message: "NGO submitted for review",
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        verificationStatus: "pending",
      },
    });
  } catch (err: any) {
    console.error("NGO register error:", err);
    return res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /api/ngos/me ──────────────────────────────────
// Returns the current user's organization
router.get("/me", async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const org = await db.query.organization.findFirst({
      where: eq(organization.ownerId, session.user.id),
    });

    if (!org) return res.status(404).json({ error: "No organization found" });

    return res.json(org);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ngos/admin/pending ───────────────────────
// Admin: list all pending orgs
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

// ─── PATCH /api/ngos/admin/:orgId/verify ──────────────
// Admin: approve or reject an org
router.patch("/admin/:orgId/verify",   async (req: Request<{ orgId: string }>, res: Response) => {
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

export default router;