import { Router, Request, Response } from "express";
import { auth } from "../lib/auth.js";
import { db } from "../db/db.js";
import { organization, userProfile, member } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";

import { getPublicOrganizations } from "../controllers/organization.public.js";

const router = Router();

// ─── POST /api/organization/register ───────────────────────────
// Requires an authenticated session. Uses Better Auth's native
// createOrganization API which automatically:
//   1. Creates the org row (with additionalFields from the body)
//   2. Creates a member row with role="owner" for the session user
//   3. Runs beforeCreateOrganization hook (sets verified=false, status=pending)
//   4. Respects allowedToCreateOrganization (prevents duplicates)
router.post("/register", async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: "You must be logged in to register an organization" });
    }

    const {
      name,
      phone,
      address,
      website,
      description,
      latitude,
      longitude,
      organizationType,
      registrationId,
      images,
    } = req.body;

    if (!name) return res.status(400).json({ error: "Organization name is required" });

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Map organizationType from frontend to the database type enum
    let mappedType: "ngo" | "clinic" | "shelter" | "rescue_center" = "ngo";
    if (organizationType === "clinic" || organizationType === "hospital") {
      mappedType = "clinic";
    } else if (organizationType === "shelter") {
      mappedType = "shelter";
    } else if (organizationType === "rescueteam" || organizationType === "rescue_center") {
      mappedType = "rescue_center";
    }

    // Delegate to Better Auth — handles org creation + member ownership + hooks
    const newOrg = await auth.api.createOrganization({
      headers: fromNodeHeaders(req.headers),
      body: {
        name,
        slug,
        phone: phone ?? undefined,
        address: address ?? undefined,
        website: website ?? undefined,
        description: description ?? undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      },
    });

    // Update the custom type and metadata columns directly using Drizzle
    await db
      .update(organization)
      .set({
        type: mappedType,
        metadata: {
          submittedAt: new Date().toISOString(),
          registrationId: registrationId ?? undefined,
          images: images ?? undefined,
        },
      })
      .where(eq(organization.id, newOrg.id));

    // Set the newly created org as the user's active organization
    await auth.api.setActiveOrganization({
      headers: fromNodeHeaders(req.headers),
      body: { organizationId: newOrg.id },
    });

    return res.status(201).json({
      message: "Organization submitted for review successfully",
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        verificationStatus: "pending",
      },
    });
  } catch (err: unknown) {
    console.error("Organization register error:", err);

    // Better Auth throws APIError with a message for known cases
    const message = err instanceof Error ? err.message : "Registration failed";

    // Detect "not allowed to create" from Better Auth's allowedToCreateOrganization
    if (message.includes("not allowed") || message.includes("already")) {
      return res.status(409).json({ error: "You already have a registered organization" });
    }

    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/organization/me ──────────────────────────────────
// Returns the organization the current user owns, using Better Auth's
// native listOrganizations + getFullOrganization APIs.
router.get("/me", async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    // Find the member record where the user is the owner
    const memberRecord = await db.query.member.findFirst({
      where: and(
        eq(member.userId, session.user.id),
        eq(member.role, "owner")
      ),
    });

    if (!memberRecord) {
      return res.status(404).json({ error: "No organization found" });
    }

    // Get full organization details directly from the DB
    const fullOrg = await db.query.organization.findFirst({
      where: eq(organization.id, memberRecord.organizationId),
    });

    if (!fullOrg) {
      return res.status(404).json({ error: "No organization found" });
    }

    return res.json({
      id: fullOrg.id,
      name: fullOrg.name,
      slug: fullOrg.slug,
      logo: fullOrg.logo,
      metadata: fullOrg.metadata,
      phone: fullOrg.phone,
      address: fullOrg.address,
      website: fullOrg.website,
      description: fullOrg.description,
      latitude: fullOrg.latitude,
      longitude: fullOrg.longitude,
      verified: fullOrg.verified,
      verificationStatus: fullOrg.verificationStatus,
      verifiedAt: fullOrg.verifiedAt,
      rejectedReason: fullOrg.rejectedReason,
      createdAt: fullOrg.createdAt,
      ownerId: session.user.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch organization";
    return res.status(500).json({ error: message });
  }
});

// ─── GET /api/organization/admin/pending ───────────────────────
// Admin-only: List all pending organizations. Uses direct DB query
// because this is app-specific business logic (not covered by Better Auth).
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch pending organizations";
    return res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/organization/admin/:orgId/verify ──────────────
// Admin-only: Approve or reject an organization. Uses direct DB update
// because this is app-specific business logic (not covered by Better Auth).
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification action failed";
    return res.status(500).json({ error: message });
  }
});

// ─── PUBLIC LISTING SEARCH DISCOVERY ROUTE ─────────────
// Open route — No session checks or requireVerifiedOrg middleware needed.
// Uses custom Drizzle query with Haversine geospatial SQL (no Better Auth equivalent).
router.get("/", getPublicOrganizations);

export default router;
