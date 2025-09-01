import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/db";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Get authenticated user from Clerk
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  const db = await getDb();

  if (!ObjectId.isValid(String(id))) {
    res.status(400).json({ error: "Invalid message ID" });
    return;
  }

  if (req.method === "PATCH") {
    const { newText, regenerate } = req.body;

    if (!newText) {
      res.status(400).json({ error: "Missing newText" });
      return;
    }

    const mid = new ObjectId(String(id));

    try {
      // store previous as history embedded (optional)
      await db.collection("messages").updateOne(
        { _id: mid, userId: clerkUserId }, // Ensure user owns the message
        {
          $set: { text: newText, editedAt: Date.now() },
          $push: { history: { text: "$text", editedAt: "$editedAt" } },
        }
      );

      // Optionally trigger regeneration: client can call /api/chat afterwards for streaming
      res.json({ ok: true, regenerate });
      return;
    } catch (error) {
      console.error("Message update error:", error);
      res.status(500).json({ error: "Failed to update message" });
      return;
    }
  }

  res.status(405).end();
  return;
}
