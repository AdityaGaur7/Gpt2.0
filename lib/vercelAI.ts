import { google } from "@ai-sdk/google";
import { streamText } from "ai";

type Model = "gemini-2.0-flash" | "gemini-1.5-pro" | "gemini-pro" | string;

export async function streamChatResponse({
  messages,
  model = "gemini-2.0-flash",
}: {
  messages: { role: string; content: string }[];
  model?: Model;
}) {
  // Use Google AI API key directly
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "No Google AI API key found. Please set GOOGLE_GENERATIVE_AI_API_KEY"
    );
  }

  try {
    // Convert messages to proper format for the AI SDK
    const formattedMessages = messages.map((msg) => ({
      role:
        msg.role === "system"
          ? ("system" as const)
          : msg.role === "user"
          ? ("user" as const)
          : ("assistant" as const),
      content: msg.content,
    }));

    // Use streamText for streaming responses with proper message format
    const { textStream } = await streamText({
      model: google(
        model as "gemini-2.0-flash" | "gemini-1.5-pro" | "gemini-pro",
        { apiKey }
      ),
      messages: formattedMessages,
    });

    // Return the stream for the API handler to forward to client
    return textStream;
  } catch (error) {
    console.error("Google AI stream error:", error);
    throw new Error(
      `Google AI API error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
