import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";

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

  const { fileUrl, fileName } = req.body;

  if (!fileUrl) {
    res.status(400).json({ error: "Missing fileUrl" });
    return;
  }

  try {
    // Upload by fetching remote file and uploading to Cloudinary
    const result = await cloudinary.uploader.upload(fileUrl, {
      resource_type: "auto",
      public_id: `uploads/${Date.now()}_${fileName || "file"}`,
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      size: result.bytes,
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
