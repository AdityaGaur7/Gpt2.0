import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";
import { getDb } from "../../lib/db";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  // Get authenticated user from Clerk
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Handle both direct file uploads and URL-based uploads
  const isMultipart = req.headers["content-type"]?.includes(
    "multipart/form-data"
  );

  if (isMultipart) {
    // Handle direct file upload
    const formidable = await import("formidable");
    const form = formidable.default({
      maxFileSize: 20 * 1024 * 1024, // 20MB
    });

    try {
      const [fields, files] = await form.parse(req);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;

      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.filepath, {
        resource_type: "auto",
        public_id: `uploads/${clerkUserId}/${Date.now()}_${
          file.originalFilename
        }`,
        folder: `chat-uploads/${clerkUserId}`,
        use_filename: true,
        unique_filename: true,
      });

      // Store file metadata in database
      const db = await getDb();
      await db.collection("uploads").insertOne({
        userId: clerkUserId,
        fileName: file.originalFilename,
        fileType: file.mimetype,
        fileSize: file.size,
        cloudinaryUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        uploadedAt: new Date(),
      });

      res.json({
        id: result.public_id,
        url: result.secure_url,
        fileName: file.originalFilename,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      });
      return;
    } catch (error) {
      console.error("File upload error:", error);
      return res.status(500).json({ error: "File upload failed" });
    }
  } else {
    // Handle URL-based upload (existing functionality)
    const { fileUrl, fileName, fileType, fileSize } = req.body;

    if (!fileUrl) {
      res.status(400).json({ error: "Missing fileUrl" });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize && fileSize > maxSize) {
      res.status(400).json({ error: "File too large. Maximum size is 10MB." });
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (fileType && !allowedTypes.includes(fileType)) {
      res.status(400).json({ error: "File type not supported." });
      return;
    }

    try {
      // Upload by fetching remote file and uploading to Cloudinary
      const result = await cloudinary.uploader.upload(fileUrl, {
        resource_type: "auto",
        public_id: `uploads/${clerkUserId}/${Date.now()}_${fileName || "file"}`,
        folder: `chat-uploads/${clerkUserId}`,
        use_filename: true,
        unique_filename: true,
      });

      // Store file metadata in database
      const db = await getDb();
      await db.collection("uploads").insertOne({
        userId: clerkUserId,
        fileName: fileName || result.original_filename,
        fileType: fileType || result.format,
        fileSize: fileSize || result.bytes,
        cloudinaryUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        uploadedAt: new Date(),
      });

      res.json({
        id: result.public_id,
        url: result.secure_url,
        fileName: fileName || result.original_filename,
        fileType: fileType || result.format,
        fileSize: fileSize || result.bytes,
        uploadedAt: new Date().toISOString(),
      });
      return;
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      res.status(500).json({ error: errorMessage });
      return;
    }
  }
}

// Disable Next.js body parsing for multipart handling
export const config = {
  api: {
    bodyParser: false,
  },
};
