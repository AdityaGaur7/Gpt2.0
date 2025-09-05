import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/db";
import { streamChatResponse, type ChatMessage } from "../../lib/vercelAI";
import { processFileForAI } from "../../lib/fileProcessor";

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
  console.log("chat-simple userId", clerkUserId);
  if (!clerkUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { messages: incomingMessages, model = "gemini-2.0-flash" } = req.body;

  // Basic validation
  if (!Array.isArray(incomingMessages)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = await getDb();

  try {
    // 1) Fetch memories from MongoDB
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
    const messages: ChatMessage[] = [];
    if (memorySystemText) {
      messages.push({ role: "system", content: memorySystemText });
    }

    // Process incoming messages and handle file uploads
    for (const m of incomingMessages) {
      const messageContent = m.text || m.content || "";
      const files = m.files || [];

      if (files.length > 0) {
        // Handle messages with files using proper AI SDK format
        const contentParts: Array<{
          type: "text" | "file";
          text?: string;
          data?: Buffer;
          mediaType?: string;
        }> = [];

        // Add text content if present
        if (messageContent.trim()) {
          contentParts.push({
            type: "text",
            text: messageContent.trim(),
          });
        }

        // Process and add files
        for (const file of files) {
          if (file.url) {
            try {
              const processedFile = await processFileForAI(file.url, file.name);

              console.log(
                `Processing file ${file.name} as ${processedFile.type}:`,
                processedFile.type === "text"
                  ? processedFile.text?.substring(0, 200) + "..."
                  : `Binary data (${processedFile.mediaType})`
              );

              contentParts.push(processedFile);
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
              // Add error message as text
              contentParts.push({
                type: "text",
                text: `[Error processing file ${file.name}]`,
              });
            }
          }
        }

        // Add message with mixed content
        if (contentParts.length > 0) {
          messages.push({
            role: m.role,
            content: contentParts,
          });
        }
      } else {
        // Handle text-only messages
        messages.push({ role: m.role, content: messageContent });
      }
    }

    const aiStream = await streamChatResponse({
      messages,
      model,
    });

    console.log("AI stream obtained:", !!aiStream);

    // Set up SSE headers and disable buffering
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform, must-revalidate",
      "X-Accel-Buffering": "no",
    });
    // Send initial comment to open the stream
    res.write(":ok\n\n");

    // Read from aiStream and forward chunks
    if (aiStream) {
      try {
        // Handle Vercel AI text stream
        let chunkCount = 0;
        for await (const chunk of aiStream) {
          if (typeof chunk === "string" && chunk.trim()) {
            chunkCount++;
            console.log(
              `Sending chunk ${chunkCount}:`,
              chunk.substring(0, 50) + "..."
            );
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          }
        }
        console.log(`Stream completed, sent ${chunkCount} chunks`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (streamError) {
        const msg =
          streamError instanceof Error
            ? streamError.message
            : "Stream error occurred";
        console.error("Stream error:", streamError);
        res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      }
    } else {
      console.error("No AI stream available");
      res.write(
        `data: ${JSON.stringify({ error: "No stream available" })}\n\n`
      );
    }

    res.end();
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    const errorMessage = err instanceof Error ? err.message : "AI error";
    return res.status(500).json({ error: errorMessage });
  }
}
