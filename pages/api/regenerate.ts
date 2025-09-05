import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/db";
import { streamChatResponse } from "../../lib/vercelAI";
import {
  trimConversationToFit,
  conversationFitsInContext,
} from "../../lib/tokenManager";

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

  const { messages, model = "gemini-2.0-flash" } = req.body;

  // Basic validation
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = await getDb();

  try {
    // 1) Fetch mem0 entries for user and prepend system context
    const mems = await db
      .collection("memories")
      .find({
        userId: clerkUserId,
      })
      .toArray();

    const memorySystemText = mems
      .map((m) => `Memory: ${m.key}: ${m.value}`)
      .join("\n");

    // 2) Build messages to send to model; include memory as system message
    const messagesWithMemory = [];
    if (memorySystemText) {
      messagesWithMemory.push({ role: "system", content: memorySystemText });
    }

    messages.forEach((m: { role: string; text?: string; content?: string }) => {
      messagesWithMemory.push({
        role: m.role,
        content: m.text || m.content || "",
      });
    });

    // 3) Apply token-based trimming to fit within context window
    let finalMessages = messagesWithMemory;
    if (!conversationFitsInContext(messagesWithMemory, model)) {
      console.log(`Conversation too long for ${model}, trimming...`);
      finalMessages = trimConversationToFit(messagesWithMemory, model);
      console.log(
        `Trimmed from ${messagesWithMemory.length} to ${finalMessages.length} messages`
      );
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
      try {
        // Handle Vercel AI text stream
        for await (const chunk of aiStream) {
          if (typeof chunk === "string" && chunk.trim()) {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          }
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (streamError) {
        console.error("Stream error:", streamError);
        res.write(
          `data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`
        );
      }
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "No stream available" })}\n\n`
      );
    }

    res.end();
  } catch (err: unknown) {
    console.error("Regenerate API error:", err);
    const errorMessage = err instanceof Error ? err.message : "AI error";
    return res.status(500).json({ error: errorMessage });
  }
}
