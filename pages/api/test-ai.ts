import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
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

  try {
    console.log("Testing AI API...");

    const testMessages = [
      {
        role: "user",
        content: "Hello, can you respond with a simple greeting?",
      },
    ];

    console.log("Test messages:", testMessages);

    const aiStream = await streamChatResponse({
      messages: testMessages,
      model: "gemini-1.5-pro",
    });

    console.log("Test AI stream obtained:", !!aiStream);

    if (aiStream) {
      let response = "";
      for await (const chunk of aiStream) {
        if (typeof chunk === "string") {
          response += chunk;
        }
      }
      console.log("Test response:", response);
      res.json({ success: true, response });
    } else {
      res.json({ success: false, error: "No stream available" });
    }
  } catch (error) {
    console.error("Test AI error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
