import { google } from "@ai-sdk/google";
import { generateText, streamText } from "ai";

type Model = "gemini-1.5-flash" | "gemini-1.5-pro" | "gemini-pro" | string;

export async function streamChatResponse({
  messages,
  model = "gemini-1.5-flash",
}: {
  messages: { role: string; content: string }[];
  model?: Model;
}) {
  const apiKey = process.env.VERCEL_AI_API_KEY;

  if (!apiKey) {
    throw new Error("No Vercel AI API key found. Please set VERCEL_AI_API_KEY");
  }

  try {
    // Convert messages to a single prompt for the AI
    const conversation = messages
      .map(
        (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    // Use streamText for streaming responses
    const { textStream } = await streamText({
      model: google(
        model as "gemini-1.5-flash" | "gemini-1.5-pro" | "gemini-pro"
      ),
      prompt: conversation + "\n\nAssistant:",
    });

    // Return the stream for the API handler to forward to client
    return textStream;
  } catch (error) {
    console.error("Vercel AI stream error:", error);
    throw new Error(
      `Vercel AI API error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
