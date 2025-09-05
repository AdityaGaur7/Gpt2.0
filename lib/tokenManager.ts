// Token management utilities for different AI models
export interface ModelConfig {
  name: string;
  maxTokens: number;
  contextWindow: number;
  inputCostPer1K: number;
  outputCostPer1K: number;
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "gemini-2.0-flash": {
    name: "Gemini 2.0 Flash",
    maxTokens: 8192,
    contextWindow: 1000000, // 1M tokens
    inputCostPer1K: 0.000075,
    outputCostPer1K: 0.0003,
  },
  "gemini-1.5-pro": {
    name: "Gemini 1.5 Pro",
    maxTokens: 8192,
    contextWindow: 2000000, // 2M tokens
    inputCostPer1K: 0.00125,
    outputCostPer1K: 0.005,
  },
  "gemini-pro": {
    name: "Gemini Pro",
    maxTokens: 2048,
    contextWindow: 30720, // 30K tokens
    inputCostPer1K: 0.0005,
    outputCostPer1K: 0.0015,
  },
  "gpt-4o-mini": {
    name: "GPT-4o Mini",
    maxTokens: 4096,
    contextWindow: 128000, // 128K tokens
    inputCostPer1K: 0.00015,
    outputCostPer1K: 0.0006,
  },
  "gpt-4o": {
    name: "GPT-4o",
    maxTokens: 4096,
    contextWindow: 128000, // 128K tokens
    inputCostPer1K: 0.005,
    outputCostPer1K: 0.015,
  },
  "gpt-4-turbo": {
    name: "GPT-4 Turbo",
    maxTokens: 4096,
    contextWindow: 128000, // 128K tokens
    inputCostPer1K: 0.01,
    outputCostPer1K: 0.03,
  },
};

// Rough token estimation (1 token ≈ 4 characters for English text)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Calculate total tokens for a conversation
export function calculateConversationTokens(
  messages: { role: string; content: string }[]
): number {
  let totalTokens = 0;

  for (const message of messages) {
    // Add tokens for role and content
    totalTokens += estimateTokens(message.role);
    totalTokens += estimateTokens(message.content);
    // Add overhead for message formatting
    totalTokens += 4;
  }

  return totalTokens;
}

// Trim conversation to fit within context window
export function trimConversationToFit(
  messages: { role: string; content: string }[],
  model: string,
  maxTokens?: number
): { role: string; content: string }[] {
  const config = MODEL_CONFIGS[model];
  if (!config) {
    console.warn(`Unknown model: ${model}, using default limits`);
    return messages;
  }

  const contextLimit = maxTokens || config.contextWindow;
  const systemMessage = messages.find((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");

  // Always keep system message
  const trimmedMessages = systemMessage ? [systemMessage] : [];
  let currentTokens = systemMessage ? estimateTokens(systemMessage.content) : 0;

  // Add messages from the end (most recent) until we hit the limit
  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const message = otherMessages[i];
    const messageTokens = estimateTokens(message.content) + 4; // +4 for overhead

    if (currentTokens + messageTokens > contextLimit) {
      break;
    }

    trimmedMessages.unshift(message);
    currentTokens += messageTokens;
  }

  return trimmedMessages;
}

// Check if conversation fits within context window
export function conversationFitsInContext(
  messages: { role: string; content: string }[],
  model: string,
  maxTokens?: number
): boolean {
  const config = MODEL_CONFIGS[model];
  if (!config) {
    return true; // Unknown model, assume it fits
  }

  const contextLimit = maxTokens || config.contextWindow;
  const totalTokens = calculateConversationTokens(messages);

  return totalTokens <= contextLimit;
}

// Get model configuration
export function getModelConfig(model: string): ModelConfig | null {
  return MODEL_CONFIGS[model] || null;
}

// Calculate estimated cost for a conversation
export function calculateConversationCost(
  messages: { role: string; content: string }[],
  model: string,
  responseTokens: number = 0
): number {
  const config = MODEL_CONFIGS[model];
  if (!config) {
    return 0;
  }

  const inputTokens = calculateConversationTokens(messages);
  const inputCost = (inputTokens / 1000) * config.inputCostPer1K;
  const outputCost = (responseTokens / 1000) * config.outputCostPer1K;

  return inputCost + outputCost;
}
