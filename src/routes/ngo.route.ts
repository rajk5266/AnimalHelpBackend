// // src/routes/ngo.ts
// import { Router } from "express";
// import { auth } from "../lib/auth.js";
// import { db } from "../db/db.js";
// import { organization, member } from "../db/schema.js"; // 👈 Make sure to import 'member' table
// import { eq, and } from "drizzle-orm";
// import { fromNodeHeaders } from "better-auth/node";

// const router = Router();

// router.post("/register", async (req, res) => {
//   const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
//   if (!session) return res.status(401).json({ error: "Unauthorized" });

//   const { name, phone, address, website, description, latitude, longitude } = req.body;

//   // 1. Check one-org-per-user by querying the member table for "owner" status
//   const existingOwnership = await db.query.member.findFirst({
//     where: and(
//       eq(member.userId, session.user.id),
//       eq(member.role, "owner")
//     ),
//   });

//   if (existingOwnership) {
//     return res.status(409).json({ error: "You already have an organization" });
//   }

//   const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

//   // Create via Better Auth (handles membership generation inside the member table automatically)
//   const org = await auth.api.createOrganization({
//     headers: fromNodeHeaders(req.headers),
//     body: {
//       name,
//       slug,
//       userId: session.user.id,
//       metadata: { status: "pending" },
//     },
//   });

//   // 2. Patch your extra fields (REMOVED ownerId from the update object)
//   await db
//     .update(organization)
//     .set({ 
//       phone, 
//       address, 
//       website, 
//       description, 
//       latitude: latitude ? parseFloat(latitude) : null, // Ensured safe parsing if types get loose
//       longitude: longitude ? parseFloat(longitude) : null, 
//     })
//     .where(eq(organization.id, org.id));

//   return res.status(201).json({ message: "NGO submitted for review", orgId: org.id });
// });

// export default router;