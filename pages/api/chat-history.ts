import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import MemoryClient from "mem0ai";

type Mem0Item = {
  id?: string;
  _id?: string;
  memory?: string;
  text?: string;
  content?: string;
  summary?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { userId } = getAuth(req);
  console.log("chat-history userId", userId);
  const mem0Key = process.env.MEMO_API_KEY;
  if (!mem0Key || !userId) {
    res.status(200).json({ items: [] });
    return;
  }

  if (req.method === "GET") {
    try {
      // List recent memories directly via REST for stable sidebar titles
      const resp = await fetch(
        `https://api.mem0.ai/v1/memories?user_id=${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${mem0Key}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!resp.ok) {
        // If unauthorized or any failure, return empty to avoid breaking UI
        res.json({ items: [] });
        return;
      }
      const listed = (await resp.json()) as
        | { memories?: Mem0Item[] }
        | Mem0Item[];
      const arr = Array.isArray(listed) ? listed : listed.memories || [];
      const items = (arr || []).map((m: Mem0Item) => {
        const raw = String(m.memory || m.text || m.content || m.summary || "");
        const id = String(m.id || m._id || Math.random());
        const title = raw.slice(0, 28) + (raw.length > 28 ? "…" : "");
        return { id, title };
      });
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
      const client = new MemoryClient({ apiKey: mem0Key });
      const messages = [{ role: "user" as const, content: text }];
      const addResUnknown = await client.add(
        messages as unknown as {
          role: "user" | "assistant";
          content: string;
        }[],
        { user_id: userId }
      );
      const addRes = addResUnknown as unknown as Mem0Item | Mem0Item[];
      const id = Array.isArray(addRes)
        ? String(addRes[0]?.id || addRes[0]?._id || "")
        : String(addRes?.id || addRes?._id || "");
      res.json({ ok: true, id });
      return;
    } catch (e) {
      console.error("chat-history POST error", e);
      res.status(500).json({ error: "Failed to add history" });
      return;
    }
  }

  res.status(405).end();
}
