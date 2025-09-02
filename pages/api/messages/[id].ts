import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../../lib/db";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Get authenticated user from Clerk
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  const db = await getDb();

  // Frontend uses UUIDs for message IDs. If it's not an ObjectId, treat as ephemeral and return success.
  const isMongoId = ObjectId.isValid(String(id));

  if (req.method === "PATCH") {
    const { newText, regenerate } = req.body;

    if (!newText) {
      res.status(400).json({ error: "Missing newText" });
      return;
    }

    if (!isMongoId) {
      // No persistent store for UUID messages; acknowledge edit request
      res.json({ ok: true, regenerate: false, id });
      return;
    }

    const mid = new ObjectId(String(id));

    try {
      // Get the current message to store in history
      const currentMessage = await db.collection("messages").findOne({
        _id: mid,
        userId: clerkUserId,
      });

      if (!currentMessage) {
        res.status(404).json({ error: "Message not found" });
        return;
      }

      // Update message with new text and store previous version in history
      await db.collection("messages").updateOne(
        { _id: mid, userId: clerkUserId },
        {
          $set: {
            text: newText,
            editedAt: Date.now(),
            isEdited: true,
          },
          $push: {
            editHistory: {
              text: currentMessage.text,
              editedAt: currentMessage.editedAt || currentMessage.createdAt,
              editedBy: clerkUserId,
            },
          },
        }
      );

      // If regeneration is requested, trigger a new AI response
      if (regenerate) {
        // Get conversation context for regeneration
        const conversation = await db
          .collection("messages")
          .find({
            userId: clerkUserId,
            createdAt: { $lte: currentMessage.createdAt },
          })
          .sort({ createdAt: 1 })
          .toArray();

        // Prepare messages for AI
        const messages = conversation.map((msg) => ({
          role: msg.role,
          content: msg.text,
        }));

        // Add the edited message
        messages.push({
          role: "user",
          content: newText,
        });

        res.json({
          ok: true,
          regenerate: true,
          messages: messages,
          messageId: id,
        });
        return;
      }

      res.json({ ok: true, regenerate: false });
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
