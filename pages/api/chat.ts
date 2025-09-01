import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/db";
import { streamChatResponse } from "../../lib/vercelAI";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  // Get authenticated user from Clerk
  const { userId: clerkUserId } = getAuth(req);

  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { messages: incomingMessages, model = "gpt-4o-mini" } = req.body;

  // basic validation
  if (!Array.isArray(incomingMessages)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = await getDb();

  try {
    // 1) Fetch mem0 entries for user and prepend system context
    // Use Clerk user ID as string instead of MongoDB ObjectId
    const mems = await db
      .collection("memories")
      .find({
        userId: clerkUserId, // Use Clerk user ID directly
      })
      .toArray();

    const memorySystemText = mems
      .map((m) => `Memory: ${m.key}: ${m.value}`)
      .join("\n");

    // 2) Build messages to send to model; include memory as system message
    const messages = [];
    if (memorySystemText) {
      messages.push({ role: "system", content: memorySystemText });
    }

    incomingMessages.forEach(
      (m: { role: string; text?: string; content?: string }) => {
        messages.push({ role: m.role, content: m.text || m.content || "" });
      }
    );

    // 3) Apply simple trimming if messages length > threshold
    const MAX_MESSAGES = 30;
    let finalMessages = messages;
    if (messages.length > MAX_MESSAGES) {
      finalMessages = [messages[0], ...messages.slice(-MAX_MESSAGES)]; // keep system + recent N
    }

    const aiStream = await streamChatResponse({
      messages: finalMessages,
      model,
    });

    // pipe the AI stream directly to client (preserve streaming)
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-transform, no-cache, must-revalidate",
    });

    // Read from aiStream and forward chunks
    if (aiStream) {
      // Handle Vercel AI ReadableStream
      const chunks: Buffer[] = [];
      for await (const chunk of aiStream as NodeJS.ReadableStream) {
        chunks.push(Buffer.from(chunk));
      }

      const fullResponse = Buffer.concat(chunks).toString();
      const lines = fullResponse.split("\n");

      for (const line of lines) {
        if (line.trim() && line.startsWith("data: ")) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "text-delta" && parsed.textDelta) {
              // Vercel AI format
              res.write(
                `data: ${JSON.stringify({ chunk: parsed.textDelta })}\n\n`
              );
            } else if (
              parsed.candidates &&
              parsed.candidates[0]?.content?.parts?.[0]?.text
            ) {
              // Legacy Gemini format (fallback)
              const content = parsed.candidates[0].content.parts[0].text;
              res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    const errorMessage = err instanceof Error ? err.message : "AI error";
    return res.status(500).json({ error: errorMessage });
  }
}
