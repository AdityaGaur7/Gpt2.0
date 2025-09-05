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


  res.status(405).end();
}
