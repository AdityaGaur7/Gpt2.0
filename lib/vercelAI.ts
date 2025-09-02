import { google } from "@ai-sdk/google";
import { ModelMessage, streamText } from "ai";

type Model =
  | "gemini-2.0-flash"
  | "gemini-1.5-pro"
  | "gemini-pro"
  | "gemini-2.5-flash"
  | string;

export interface MessageContent {
  type: "text" | "file";
  text?: string;
  data?: Buffer;
  mediaType?: string;
}

export interface ChatMessage {
  role: string;
  content: string | MessageContent[];
}

export async function streamChatResponse({
  messages,
  model = "gemini-2.0-flash",
}: {
  messages: ChatMessage[];
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
    // Build mixed content (text + file) parts per message
    const formattedMessages: ModelMessage[] = messages
      .map((msg) => {
        const role =
          msg.role === "system"
            ? ("system" as const)
            : msg.role === "user"
            ? ("user" as const)
            : ("assistant" as const);

        if (typeof msg.content === "string") {
          const text = (msg.content || "").trim();
          if (!text) return null;
          return {
            role,
            content: [{ type: "text", text }],
          } as unknown as ModelMessage;
        }

        if (Array.isArray(msg.content)) {
          const parts: Array<
            | { type: "text"; text: string }
            | { type: "file"; data: Buffer; mediaType?: string }
          > = [];
          for (const part of msg.content) {
            if (part.type === "text" && part.text && part.text.trim()) {
              parts.push({ type: "text", text: part.text });
            } else if (part.type === "file" && part.data) {
              parts.push({
                type: "file",
                data: part.data,
                mediaType: part.mediaType,
              });
            }
          }
          if (parts.length === 0) return null;
          return { role, content: parts } as unknown as ModelMessage;
        }

        return null;
      })
      .filter(Boolean) as ModelMessage[];

    if (formattedMessages.length === 0) {
      throw new Error("No non-empty messages to send to the model");
    }

    // Debug: Log what we're sending to Gemini
    console.log(
      "Messages being sent to Gemini:",
      JSON.stringify(formattedMessages, null, 2)
    );

    const { textStream } = await streamText({
      model: google(
        model as
          | "gemini-2.0-flash"
          | "gemini-1.5-pro"
          | "gemini-pro"
          | "gemini-2.5-flash"
      ),
      messages: formattedMessages,
    });

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
