// Advanced streaming utilities for chat responses

export interface StreamEvent {
  type: "chunk" | "done" | "error" | "metadata" | "thinking";
  data: unknown;
  timestamp: number;
}

export interface StreamMetadata {
  model: string;
  tokensUsed?: number;
  cost?: number;
  duration?: number;
  contextLength?: number;
}

export class StreamingResponse {
  private controller: ReadableStreamDefaultController<StreamEvent>;
  private startTime: number;
  private metadata: StreamMetadata;

  constructor(
    controller: ReadableStreamDefaultController<StreamEvent>,
    metadata: StreamMetadata
  ) {
    this.controller = controller;
    this.startTime = Date.now();
    this.metadata = metadata;
  }

  sendChunk(chunk: string): void {
    this.controller.enqueue({
      type: "chunk",
      data: { chunk },
      timestamp: Date.now(),
    });
  }

  sendThinking(thought: string): void {
    this.controller.enqueue({
      type: "thinking",
      data: { thought },
      timestamp: Date.now(),
    });
  }

  sendMetadata(metadata: Partial<StreamMetadata>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.controller.enqueue({
      type: "metadata",
      data: this.metadata,
      timestamp: Date.now(),
    });
  }

  sendError(error: string): void {
    this.controller.enqueue({
      type: "error",
      data: { error },
      timestamp: Date.now(),
    });
  }

  sendDone(): void {
    const duration = Date.now() - this.startTime;
    this.sendMetadata({ duration });

    this.controller.enqueue({
      type: "done",
      data: {
        metadata: this.metadata,
        duration,
      },
      timestamp: Date.now(),
    });

    this.controller.close();
  }
}

// Enhanced streaming with thinking mode and metadata
export async function createEnhancedStream(
  aiStream: AsyncIterable<string>,
  metadata: StreamMetadata
): Promise<ReadableStream<StreamEvent>> {
  return new ReadableStream<StreamEvent>({
    start(controller) {
      const streamingResponse = new StreamingResponse(controller, metadata);

      // Process the AI stream
      (async () => {
        try {
          let fullResponse = "";
          let chunkCount = 0;

          for await (const chunk of aiStream) {
            if (typeof chunk === "string" && chunk.trim()) {
              fullResponse += chunk;
              chunkCount++;

              // Send chunk
              streamingResponse.sendChunk(chunk);

              // Send metadata updates every 10 chunks
              if (chunkCount % 10 === 0) {
                streamingResponse.sendMetadata({
                  tokensUsed: Math.ceil(fullResponse.length / 4), // Rough estimate
                });
              }

              // Simulate thinking for longer responses
              if (chunkCount % 20 === 0 && fullResponse.length > 100) {
                streamingResponse.sendThinking("Processing your request...");
              }
            }
          }

          // Final metadata
          streamingResponse.sendMetadata({
            tokensUsed: Math.ceil(fullResponse.length / 4),
            contextLength: metadata.contextLength,
          });

          streamingResponse.sendDone();
        } catch (error) {
          console.error("Stream processing error:", error);
          streamingResponse.sendError(
            error instanceof Error ? error.message : "Stream processing failed"
          );
        }
      })();
    },
  });
}

// Parse streaming events from client
export function parseStreamEvent(event: string): StreamEvent | null {
  try {
    if (event.startsWith("data: ")) {
      const data = event.slice(6);
      if (data.trim()) {
        const parsed = JSON.parse(data);
        return {
          type: parsed.type || "chunk",
          data: parsed,
          timestamp: Date.now(),
        };
      }
    }
  } catch (error) {
    console.error("Failed to parse stream event:", error);
  }
  return null;
}

// Convert ReadableStream to SSE format
export function streamToSSE(
  stream: ReadableStream<StreamEvent>
): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      const reader = stream.getReader();

      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            // Convert to SSE format
            const sseData = `data: ${JSON.stringify(value)}\n\n`;
            controller.enqueue(sseData);
          }
        } catch (error) {
          console.error("SSE conversion error:", error);
          controller.error(error);
        }
      })();
    },
  });
}

// Rate limiting for streaming
export class StreamRateLimiter {
  private lastChunkTime: number = 0;
  private minInterval: number;

  constructor(minIntervalMs: number = 50) {
    this.minInterval = minIntervalMs;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastChunk = now - this.lastChunkTime;

    if (timeSinceLastChunk < this.minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minInterval - timeSinceLastChunk)
      );
    }

    this.lastChunkTime = Date.now();
  }
}

// Stream buffer for handling backpressure
export class StreamBuffer {
  private buffer: string[] = [];
  private maxBufferSize: number;
  private isProcessing: boolean = false;

  constructor(maxSize: number = 100) {
    this.maxBufferSize = maxSize;
  }

  add(chunk: string): void {
    this.buffer.push(chunk);

    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift(); // Remove oldest chunk
    }
  }

  get(): string[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }

  get size(): number {
    return this.buffer.length;
  }
}
