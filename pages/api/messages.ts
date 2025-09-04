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
      const { conversationId } = req.query;

      if (conversationId) {
        // Get messages for a specific conversation
        const messages = await db
          .collection("messages")
          .find({
            userId,
            conversationId: conversationId as string,
          })
          .sort({ createdAt: 1 })
          .toArray();

        res.json(messages);
      } else {
        // Get all conversations for the user
        const conversations = await db
          .collection("conversations")
          .find({ userId })
          .sort({ updatedAt: -1 })
          .toArray();

        res.json(conversations);
      }
      return;
    } catch (error) {
      console.error("Messages fetch error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
      return;
    }
  }

  if (req.method === "POST") {
    try {
      const { conversationId, role, content, files } = req.body;

      if (!role || !content || content.trim() === "") {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Create or update conversation
      let finalConversationId = conversationId;
      if (!finalConversationId) {
        // Generate a better title for the conversation
        let title = content.slice(0, 50);
        if (content.length > 50) {
          title += "…";
        }
        // If the content is very short or empty, use a default title
        if (!title.trim()) {
          title = "New Chat";
        }

        const conversationResult = await db
          .collection("conversations")
          .insertOne({
            userId,
            title,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        finalConversationId = conversationResult.insertedId.toString();
      } else {
        // Update conversation timestamp
        await db
          .collection("conversations")
          .updateOne(
            { _id: new ObjectId(finalConversationId), userId },
            { $set: { updatedAt: new Date() } }
          );

        // If this is the first message in the conversation, update the title
        if (role === "user") {
          const messageCount = await db.collection("messages").countDocuments({
            conversationId: finalConversationId,
            userId,
          });

          if (messageCount === 0) {
            // This is the first message, update the conversation title
            let title = content.slice(0, 50);
            if (content.length > 50) {
              title += "…";
            }
            if (!title.trim()) {
              title = "New Chat";
            }

            await db
              .collection("conversations")
              .updateOne(
                { _id: new ObjectId(finalConversationId), userId },
                { $set: { title, updatedAt: new Date() } }
              );
          }
        }
      }

      // Store the message
      const messageResult = await db.collection("messages").insertOne({
        userId,
        conversationId: finalConversationId,
        role,
        content,
        files: files || [],
        createdAt: new Date(),
      });

      res.json({
        ok: true,
        messageId: messageResult.insertedId.toString(),
        conversationId: finalConversationId,
      });
      return;
    } catch (error) {
      console.error("Message creation error:", error);
      res.status(500).json({ error: "Failed to create message" });
      return;
    }
  }

  if (req.method === "PUT") {
    try {
      const { id, content } = req.body;

      if (!id || !content) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      await db
        .collection("messages")
        .updateOne(
          { _id: new ObjectId(id), userId },
          { $set: { content, updatedAt: new Date() } }
        );

      res.json({ ok: true });
      return;
    } catch (error) {
      console.error("Message update error:", error);
      res.status(500).json({ error: "Failed to update message" });
      return;
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = req.body;

      if (!id) {
        res.status(400).json({ error: "Missing message ID" });
        return;
      }

      await db.collection("messages").deleteOne({
        _id: new ObjectId(id),
        userId,
      });

      res.json({ ok: true });
      return;
    } catch (error) {
      console.error("Message deletion error:", error);
      res.status(500).json({ error: "Failed to delete message" });
      return;
    }
  }

  res.status(405).end();
}
