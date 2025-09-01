import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenerativeAIStream, StreamingTextResponse } from "ai";

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

  // Initialize Google Generative AI
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  // Convert messages to Gemini format
  const geminiMessages = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : msg.role,
    parts: [{ text: msg.content }],
  }));

  try {
    // Generate content stream
    const result = await geminiModel.generateContentStream({
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    // Convert to Vercel AI stream
    const stream = GoogleGenerativeAIStream(result);

    // Return the stream for the API handler to forward to client
    return stream;
  } catch (error) {
    console.error("Vercel AI stream error:", error);
    throw new Error(
      `Vercel AI API error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
