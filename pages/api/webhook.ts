import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  // support Cloudinary or other external callbacks
  const event = req.body;
  
  try {
    // process event, validate signature, queue background job or update DB
    console.log("webhook event", event.type || event.event);
    
    // TODO: verify signature for security
    // TODO: handle different webhook types (Cloudinary, payment, etc.)
    
    // For now, just acknowledge receipt
    res.json({ ok: true, received: true });
    return;
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
    return;
  }
}
