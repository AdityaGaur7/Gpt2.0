"use client";

import { useMemo, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import MessageBubble, { type Message } from "./message-bubble";
import Composer, { type ComposerFile } from "./composer";
import Sidebar from "./sidebar";

export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const assistantDraftRef = useRef<string>("");
  const draftIdRef = useRef<string>("");
  const canScrollId = useMemo(() => crypto.randomUUID(), []);
  const { user, isLoaded } = useUser();

  async function addMessage(text: string, files: ComposerFile[]) {
    // Check if user is authenticated
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      files:
        files.length > 0
          ? files.map((f) => ({
              name: f.name,
              url: f.url || "",
              type: f.type || "unknown",
            }))
          : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Call API to stream response
    setIsStreaming(true);
    draftIdRef.current = crypto.randomUUID(); // Generate unique draft ID
    assistantDraftRef.current = ""; // Reset draft content

    try {
      const resp = await fetch("/api/chat-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id, // Use Clerk user ID instead of hardcoded demo ID
          messages: [...messages, userMsg],
          model: "gemini-2.0-flash",
        }),
      });

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }

      // Handle SSE streaming
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let draft = "";

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          const chunk = decoder.decode(value);
          // Parse SSE format: data: {"chunk":"..."}
          try {
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6); // remove "data: "
                if (data.trim()) {
                  const payload = JSON.parse(data);
                  if (payload.chunk) {
                    draft += payload.chunk;
                    assistantDraftRef.current = draft;
                    setMessages((m) => {
                      const withoutDraft = m.filter(
                        (x) => x.id !== draftIdRef.current
                      );
                      return [
                        ...withoutDraft,
                        {
                          id: draftIdRef.current,
                          role: "assistant",
                          content: draft,
                        },
                      ];
                    });
                  } else if (payload.error) {
                    console.error("Stream error:", payload.error);
                    throw new Error(payload.error);
                  } else if (payload.done) {
                    // Stream completed successfully
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.error("Stream parse error", e);
            throw e; // Re-throw to be caught by outer try-catch
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      // Replace draft with final message
      setMessages((m) => {
        const withoutDraft = m.filter((x) => x.id !== draftIdRef.current);
        return [
          ...withoutDraft,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: assistantDraftRef.current,
          },
        ];
      });
      assistantDraftRef.current = "";
      draftIdRef.current = "";
    }
  }

  function onDelete(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function onEdit(id: string, content: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m))
    );

    // Call API to update message
    try {
      await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newText: content, regenerate: true }),
      });
    } catch (error) {
      console.error("Edit error:", error);
    }
  }

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="relative flex min-h-dvh flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if user is not authenticated
  if (!user) {
    return (
      <div className="relative flex min-h-dvh flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Please sign in to chat</h2>
            <p className="text-muted-foreground">
              You need to be authenticated to use the chat feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Mobile-only inline sidebar as a guard if someone lands directly here on small screens */}
      <div className="md:hidden sr-only">
        <Sidebar />
      </div>

      <div className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-3 pb-28 pt-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <h2 className="text-xl font-semibold mb-2">
                Welcome to Chatgpt 2.0 Chat
              </h2>
              <p>Start a conversation by typing a message below.</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-2xl rounded-lg px-4 py-3 text-sm leading-relaxed bg-card text-foreground shadow-sm border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          {/* Scroll anchor */}
          <div id={canScrollId} />
        </div>
      </div>

      <Composer onSend={addMessage} disabled={isStreaming} />
    </div>
  );
}
