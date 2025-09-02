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
      // Get recent chat history from MongoDB
      const chatHistory = await db
        .collection("chat_history")
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      const items = chatHistory.map((chat) => ({
        id: chat._id.toString(),
        title:
          chat.title ||
          chat.message.slice(0, 28) + (chat.message.length > 28 ? "…" : ""),
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
      // Store chat history in MongoDB
      const result = await db.collection("chat_history").insertOne({
        userId,
        message: text,
        title: text.slice(0, 50) + (text.length > 50 ? "…" : ""),
        createdAt: new Date(),
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
