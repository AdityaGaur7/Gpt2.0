import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/db";
import { ObjectId } from "mongodb";

type Mem0Options = RequestInit & { apiKey: string };
async function mem0Fetch(path: string, options: Mem0Options) {
  const base = "https://api.mem0.ai/v1";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${options.apiKey}`,
  };
  const resp = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Mem0 API ${resp.status}: ${text}`);
  }
  return resp.json();
}

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
  const mem0Key = process.env.MEMO_API_KEY;

  if (req.method === "GET") {
    try {
      if (mem0Key) {
        // Use Mem0 hosted memory when available
        const data = await mem0Fetch(
          `/memories?user_id=${encodeURIComponent(clerkUserId)}`,
          {
            method: "GET",
            apiKey: mem0Key,
          }
        );
        res.json(data?.memories ?? data ?? []);
        return;
      }
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
      if (mem0Key) {
        const payload = {
          user_id: clerkUserId,
          memory: `${key}: ${value}`,
        };
        const data = await mem0Fetch(`/memories`, {
          method: "POST",
          body: JSON.stringify(payload),
          apiKey: mem0Key,
        });
        res.json({ ok: true, id: data?.id ?? data?.memory?.id });
        return;
      }

      await db.collection("memories").insertOne({
        userId: clerkUserId,
        key,
        value,
        createdAt: Date.now(),
      });
      res.json({ ok: true });
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
      if (mem0Key) {
        // Mem0 update via delete+recreate (Mem0 lacks direct update in some tiers)
        try {
          await mem0Fetch(`/memories/${encodeURIComponent(id)}`, {
            method: "DELETE",
            apiKey: mem0Key,
          });
        } catch {}
        const payload = { user_id: clerkUserId, memory: value };
        const data = await mem0Fetch(`/memories`, {
          method: "POST",
          body: JSON.stringify(payload),
          apiKey: mem0Key,
        });
        res.json({ ok: true, id: data?.id ?? data?.memory?.id });
        return;
      }

      await db
        .collection("memories")
        .updateOne(
          { _id: new ObjectId(id), userId: clerkUserId },
          { $set: { value, updatedAt: Date.now() } }
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
