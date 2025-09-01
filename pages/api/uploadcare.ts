import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { uploadcareService } from "../../lib/uploadcare";
import { getDb } from "../../lib/db";

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
    // Upload file to Uploadcare
    const uploadResult = await uploadcareService.uploadFromUrl(fileUrl, {
      fileName: fileName,
    });

    // Store file metadata in database
    const db = await getDb();
    await db.collection("uploads").insertOne({
      userId: clerkUserId,
      fileName: uploadResult.name,
      fileType: uploadResult.mimeType,
      fileSize: uploadResult.size,
      uploadcareUuid: uploadResult.uuid,
      uploadcareUrl: uploadResult.url,
      uploadcareCdnUrl: uploadResult.cdnUrl,
      uploadedAt: new Date(),
    });

    res.json({
      id: uploadResult.uuid,
      url: uploadResult.cdnUrl,
      fileName: uploadResult.name,
      fileType: uploadResult.mimeType,
      fileSize: uploadResult.size,
      uploadedAt: new Date().toISOString(),
    });
    return;
  } catch (error: unknown) {
    console.error("Uploadcare upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    res.status(500).json({ error: errorMessage });
    return;
  }
}
