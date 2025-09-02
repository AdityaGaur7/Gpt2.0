import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { getDb } from "../../lib/db";
import { streamChatResponse, type ChatMessage } from "../../lib/vercelAI";
import {
  processFileFromUrlAsText,
  createFileContent,
  createTextContent,
  validateFileSize,
} from "../../lib/fileProcessor";

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
    const messages: ChatMessage[] = [];
    if (memorySystemText) {
      messages.push({ role: "system", content: memorySystemText });
    }

    // Process incoming messages and handle file uploads
    for (const m of incomingMessages) {
      const messageContent = m.text || m.content || "";
      const files = m.files || [];

      if (files.length > 0) {
        // Handle messages with files
        const contentArray = [];
        let combinedText = messageContent.trim();

        // Process and add files
        for (const file of files) {
          if (file.url) {
            try {
              const processedFile = await processFileFromUrlAsText(
                file.url,
                file.name
              );

              if (processedFile.type === "text") {
                // PDF converted to text - combine with user message
                console.log(
                  `PDF text extracted from ${file.name}:`,
                  processedFile.text.substring(0, 200) + "..."
                );
                if (combinedText) {
                  combinedText += `\n\n--- Content from ${file.name} ---\n${processedFile.text}`;
                } else {
                  combinedText = `Content from ${file.name}:\n${processedFile.text}`;
                }
              } else {
                // Other files (images, etc.) - add as file content
                const fileData = {
                  name: file.name,
                  data: processedFile.data,
                  mediaType: processedFile.mediaType,
                  size: processedFile.data.length,
                };

                // Validate file size (max 20MB for Gemini)
                if (!validateFileSize(fileData, 20)) {
                  console.warn(`File ${file.name} is too large, skipping`);
                  continue;
                }

                contentArray.push(createFileContent(fileData));
              }
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
              // Continue with other files
            }
          }
        }

        // Add combined text content if we have any
        if (combinedText) {
          console.log(
            "Final combined text being sent to Gemini:",
            combinedText.substring(0, 300) + "..."
          );
          contentArray.push(createTextContent(combinedText));
        }

        if (contentArray.length > 0) {
          messages.push({ role: m.role, content: contentArray });
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

    // Set up SSE headers
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
    console.error("Chat API error:", err);
    const errorMessage = err instanceof Error ? err.message : "AI error";
    return res.status(500).json({ error: errorMessage });
  }
}
