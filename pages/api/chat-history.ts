import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { userId } = getAuth(req);
  console.log("chat-history userId", userId);

  if (!userId) {
    res.status(200).json({ items: [] });
    return;
  }

  const db = await getDb();

  if (req.method === "GET") {
    try {
      // Return recent conversations as chat history
      const conversations = await db
        .collection("conversations")
        .find({ userId })
        .sort({ updatedAt: -1 })
        .limit(20)
        .toArray();

      const items = conversations.map((c) => ({
        id: c._id.toString(),
        title: (c.title && String(c.title).trim()) || "New Chat",
      }));

      res.json({ items });
      return;
    } catch (e) {
      console.error("chat-history GET error", e);
      res.json({ items: [] });
      return;
    }
  }

  if (req.method === "POST") {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing text" });
      return;
    }
    try {
      // Create a new conversation from provided text (first user message)
      const titleBase = text.slice(0, 50) + (text.length > 50 ? "…" : "");
      const result = await db.collection("conversations").insertOne({
        userId,
        title: titleBase.trim() || "New Chat",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.json({ ok: true, id: result.insertedId.toString() });
      return;
    } catch (e) {
      console.error("chat-history POST error", e);
      res.status(500).json({ error: "Failed to add history" });
      return;
    }
  }

  res.status(405).end();
}
