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

export interface FileMessage {
  role: "user";
  content: Array<{
    type: "text" | "file";
    text?: string;
    data?: Buffer;
    mediaType?: string;
  }>;
}

// Example function showing proper usage pattern
export async function generateTextWithFiles({
  messages,
  model = "gemini-2.5-flash",
}: {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content:
      | string
      | Array<{
          type: "text" | "file";
          text?: string;
          data?: Buffer;
          mediaType?: string;
        }>;
  }>;
  model?: Model;
}) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("No Google AI API key found");
  }

  // This would use generateText for non-streaming responses
  // const result = await generateText({
  //   model: google(model as any),
  //   messages: messages as any,
  // });
  // return result.text;

  // For now, we'll use streamText as it's more suitable for chat
  const { textStream } = await streamText({
    model: google(
      model as
        | "gemini-2.0-flash"
        | "gemini-1.5-pro"
        | "gemini-pro"
        | "gemini-2.5-flash"
    ),
    messages: messages as ModelMessage[],
  });

  // Convert stream to text
  let result = "";
  for await (const chunk of textStream) {
    result += chunk;
  }
  return result;
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
    // Build messages with proper file handling for AI SDK
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
            content: text,
          } as unknown as ModelMessage;
        }

        if (Array.isArray(msg.content)) {
          // Handle mixed content (text + files)
          const contentParts: Array<{
            type: "text" | "file";
            text?: string;
            data?: Buffer;
            mediaType?: string;
          }> = [];

          for (const part of msg.content) {
            if (part.type === "text" && part.text && part.text.trim()) {
              contentParts.push({
                type: "text",
                text: part.text,
              });
            } else if (part.type === "file" && part.data && part.mediaType) {
              contentParts.push({
                type: "file",
                data: part.data,
                mediaType: part.mediaType,
              });
            }
          }

          if (contentParts.length === 0) return null;

          // If only text content, return as string
          if (contentParts.every((part) => part.type === "text")) {
            const text = contentParts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n\n")
              .trim();
            return { role, content: text } as unknown as ModelMessage;
          }

          // If mixed content, return as array
          return { role, content: contentParts } as unknown as ModelMessage;
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

    async function tryStream(selectedModel: Model) {
      const { textStream } = await streamText({
        model: google(
          selectedModel as
            | "gemini-2.0-flash"
            | "gemini-1.5-pro"
            | "gemini-pro"
            | "gemini-2.5-flash"
        ),
        messages: formattedMessages,
      });
      return textStream;
    }

    try {
      return await tryStream(model);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const statusCode = (e as { statusCode?: number } | undefined)?.statusCode;
      const isRateLimited =
        statusCode === 429 ||
        message.includes("Quota exceeded") ||
        message.includes("RATE_LIMIT_EXCEEDED");

      if (!isRateLimited) throw e;

      // Fallback chain on rate limit
      const fallbacks: Model[] = [
        "gemini-2.5-flash",
        "gemini-1.5-pro",
        "gemini-pro",
      ].filter((m) => m !== model);

      for (const alt of fallbacks) {
        try {
          console.warn(
            `Primary model '${model}' rate-limited. Falling back to '${alt}'.`
          );
          return await tryStream(alt);
        } catch (innerErr: unknown) {
          const innerMsg =
            innerErr instanceof Error ? innerErr.message : String(innerErr);
          const innerCode = (innerErr as { statusCode?: number } | undefined)
            ?.statusCode;
          const innerRate =
            innerCode === 429 ||
            innerMsg.includes("Quota exceeded") ||
            innerMsg.includes("RATE_LIMIT_EXCEEDED");
          if (!innerRate) throw innerErr;
          // try next fallback
        }
      }

      throw new Error(
        "All fallback models are rate-limited. Please wait a minute or configure a model with available quota."
      );
    }
  } catch (error) {
    console.error("Google AI stream error:", error);
    throw new Error(
      `Google AI API error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
