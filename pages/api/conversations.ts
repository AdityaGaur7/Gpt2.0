import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/db";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = await getDb();

  if (req.method === "GET") {
    try {
      // Get all conversations for the user
      const conversations = await db
        .collection("conversations")
        .find({ userId })
        .sort({ updatedAt: -1 })
        .toArray();

      res.json(conversations);
      return;
    } catch (error) {
      console.error("Conversations fetch error:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
      return;
    }
  }

  if (req.method === "POST") {
    try {
      const { title } = req.body;

      // Create new conversation
      const result = await db.collection("conversations").insertOne({
        userId,
        title: title || "New Chat",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.json({
        ok: true,
        conversationId: result.insertedId.toString(),
      });
      return;
    } catch (error) {
      console.error("Conversation creation error:", error);
      res.status(500).json({ error: "Failed to create conversation" });
      return;
    }
  }

  if (req.method === "PUT") {
    try {
      const { id, title } = req.body;

      if (!id || !title) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await db
        .collection("conversations")
        .updateOne(
          { _id: new ObjectId(id), userId },
          { $set: { title, updatedAt: new Date() } }
        );

      res.json({ ok: true });
      return;
    } catch (error) {
      console.error("Conversation update error:", error);
      res.status(500).json({ error: "Failed to update conversation" });
      return;
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.body;

      if (!id) {
        res.status(400).json({ error: "Missing conversation ID" });
        return;
      }

      // Delete conversation and all its messages
      await db.collection("conversations").deleteOne({
        _id: new ObjectId(id),
        userId,
      });

      await db.collection("messages").deleteMany({
        conversationId: id,
        userId,
      });

      res.json({ ok: true });
      return;
    } catch (error) {
      console.error("Conversation deletion error:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
      return;
    }
  }

  res.status(405).end();
}
