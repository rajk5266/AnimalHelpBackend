// import { Router, Request, Response } from "express";
// import multer from "multer";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { auth } from "../lib/auth.js";
// import { fromNodeHeaders } from "better-auth/node";
// import { env } from "../config/env.js"; // Adjust path to match your environment wrapper location

// const router = Router();

// // 1. Initialize S3 client for Cloudflare R2
// const s3Client = new S3Client({
//   region: "auto",
//   endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
//   credentials: {
//     accessKeyId: env.R2_ACCESS_KEY_ID,
//     secretAccessKey: env.R2_SECRET_ACCESS_KEY,
//   },
// });

// // Configure localized Multer limits for parsing file buffers
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB guard limit
// });

// // ─── POST /api/upload ──────────────────────────────────────────
// router.post("/", upload.array("files"), async (req: Request, res: Response) => {
//   try {
//     // Authenticate the user session via Better-Auth
//     const session = await auth.api.getSession({
//       headers: fromNodeHeaders(req.headers),
//     });

//     if (!session) {
//       return res.status(401).json({ error: "Unauthorized. Please log in to upload files." });
//     }

//     const files = req.files as Express.Multer.File[];
//     if (!files || files.length === 0) {
//       return res.status(400).json({ error: "No attachment files loaded." });
//     }

//     const targetFolder = req.body.folder as string || "organization_reg_docs"; // Default folder if not specified

//     const uploadedUrls: string[] = [];

//     // Loop through files and upload to R2 bucket
//     for (const file of files) {
//       if (file.size === 0) continue;

//       // Sanitize the filename to make it URL safe
//       const sanitizedName = file.originalname.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.\-_]/g, "");
//       const uniqueKey = `uploads/${Date.now()}-${sanitizedName}`;

//       // Set up the S3 configuration mapping payload command
//       const uploadCommand = new PutObjectCommand({
//         Bucket: env.R2_BUCKET,
//         Key: uniqueKey,
//         Body: file.buffer,
//         ContentType: file.mimetype || file.mimetype, // Fallbacks matching multer typing shapes
//       });

//       // Execute execution worker straight to R2 storage space
//       await s3Client.send(uploadCommand);

//       // Construct your file path using the custom Public URL domain instead of bucket origin link
//       const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${uniqueKey}`;
//       uploadedUrls.push(publicUrl);
//     }

//     return res.status(200).json({ urls: uploadedUrls });

//   } catch (error: any) {
//     console.error("Cloudflare R2 storage upload failure:", error);
//     return res.status(500).json({ error: error.message || "Failed to upload assets to R2." });
//   }
// });

// export default router;



import { Router, Request, Response } from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { env } from "../config/env.js";

const router = Router();

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

// Configure localized Multer limits for parsing file buffers
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB guard limit
});

// ─── POST /api/upload ──────────────────────────────────────────
router.post("/", upload.array("files"), async (req: Request, res: Response) => {
  try {
    // Authenticate the user session via Better-Auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized. Please log in to upload files." });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No attachment files loaded." });
    }

    // Extract and sanitize target folder to prevent directory traversal exploits
    const rawFolder = (req.body.folder as string) || "org_documents";
    const cleanFolder = rawFolder.replace(/[^a-zA-Z0-9\-_]/g, "");

    const uploadedUrls: string[] = [];

    // Loop through files and upload to R2 bucket
    for (const file of files) {
      if (file.size === 0) continue;

      // Sanitize the filename to make it URL safe
      const sanitizedName = file.originalname.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.\-_]/g, "");
      
      // ✅ Dynamic key utilizing your passed-in folder parameter prefix
      const uniqueKey = `${cleanFolder}/${Date.now()}-${sanitizedName}`;

      // Set up the S3 configuration mapping payload command
      const uploadCommand = new PutObjectCommand({
        Bucket: env.R2_BUCKET, 
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      // Stream straight to R2 storage space
      await s3Client.send(uploadCommand);

      // Construct your file path using the custom Public URL domain instead of bucket origin link
      const publicUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${uniqueKey}`;
      uploadedUrls.push(publicUrl);
    }

    return res.status(200).json({ urls: uploadedUrls });

  } catch (error: any) {
    console.error("Cloudflare R2 storage upload failure:", error);
    return res.status(500).json({ error: error.message || "Failed to upload assets to R2." });
  }
});

export default router;