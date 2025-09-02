import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/db";
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

  const db = await getDb();

  if (req.method === "GET") {
    try {
      const mems = await db
        .collection("memories")
        .find({ userId: clerkUserId })
        .toArray();
      res.json(mems);
      return;
    } catch (error) {
      console.error("Memory fetch error:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
      return;
    }
  } else if (req.method === "POST") {
    const { key, value } = req.body;

    if (!key || !value) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const result = await db.collection("memories").insertOne({
        userId: clerkUserId,
        key,
        value,
        createdAt: new Date(),
      });
      res.json({ ok: true, id: result.insertedId.toString() });
      return;
    } catch (error) {
      console.error("Memory creation error:", error);
      res.status(500).json({ error: "Failed to create memory" });
      return;
    }
  } else if (req.method === "PUT") {
    const { id, value } = req.body;

    if (!id || !value) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      await db
        .collection("memories")
        .updateOne(
          { _id: new ObjectId(id), userId: clerkUserId },
          { $set: { value, updatedAt: new Date() } }
        );
      res.json({ ok: true });
      return;
    } catch (error) {
      console.error("Memory update error:", error);
      res.status(500).json({ error: "Failed to update memory" });
      return;
    }
  }

  res.status(405).end();
  return;
}
