"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import MessageBubble, { type Message } from "./message-bubble";
import Composer, { type ComposerFile } from "./composer";
import Sidebar from "./sidebar";

export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const canScrollId = useMemo(() => crypto.randomUUID(), []);
  useEffect(() => {
    const el = document.getElementById(canScrollId);
    el?.scrollIntoView({ behavior: "smooth" });
  }, [messages, canScrollId]);

  const assistantDraftRef = useRef<string>("");
  const draftIdRef = useRef<string>("");
  const { user, isLoaded } = useUser();

  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        // Trigger sidebar refresh
        window.dispatchEvent(new CustomEvent("refresh-history"));
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  }, [user]);

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      if (!user) return;

      try {
        const response = await fetch(
          `/api/messages?conversationId=${conversationId}`
        );
        if (response.ok) {
          const messages = await response.json();
          setMessages(
            messages.map(
              (msg: {
                _id: string;
                role: string;
                content: string;
                files?: { name: string; url: string; type: string }[];
              }) => ({
                id: msg._id,
                role: msg.role,
                content: msg.content,
                files: msg.files,
              })
            )
          );
          setCurrentConversationId(conversationId);
        }
      } catch (error) {
        console.error("Failed to load conversation messages:", error);
      }
    },
    [user]
  );

  // Load conversations on component mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Listen for "new-chat" events to reset conversation
  useEffect(() => {
    function onNewChat() {
      setMessages([]);
      setCurrentConversationId(null);
      // Clear any streaming state
      setIsStreaming(false);
      setIsUploading(false);
    }
    window.addEventListener("new-chat", onNewChat as EventListener);
    return () =>
      window.removeEventListener("new-chat", onNewChat as EventListener);
  }, []);

  // Listen for conversation selection events
  useEffect(() => {
    function onConversationSelect(event: CustomEvent) {
      const conversationId = event.detail.conversationId;
      if (conversationId) {
        loadConversationMessages(conversationId);
        // Update sidebar selection state
        window.dispatchEvent(
          new CustomEvent("conversation-selected", {
            detail: { conversationId },
          })
        );
      }
    }
    window.addEventListener(
      "conversation-select",
      onConversationSelect as EventListener
    );
    return () =>
      window.removeEventListener(
        "conversation-select",
        onConversationSelect as EventListener
      );
  }, [loadConversationMessages]);

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

    // Store user message in MongoDB
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConversationId,
          role: "user",
          content: text,
          files: files.map((f) => ({
            name: f.name,
            url: f.url || "",
            type: f.type || "unknown",
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (!currentConversationId && result.conversationId) {
          setCurrentConversationId(result.conversationId);
          // Reload conversations to show the new one
          loadConversations();
        }
      }
    } catch (error) {
      console.error("Failed to store user message:", error);
    }

    // Fire-and-forget: record in chat history
    try {
      fetch("/api/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then(() => {
          window.dispatchEvent(new CustomEvent("refresh-history"));
        })
        .catch(() => {});
    } catch {}

    // Call API to stream response
    setIsStreaming(true);
    draftIdRef.current = crypto.randomUUID(); // Generate unique draft ID
    assistantDraftRef.current = ""; // Reset draft content

    // Add loading message bubble immediately
    setMessages((prev) => [
      ...prev,
      {
        id: draftIdRef.current,
        role: "assistant",
        content: "Thinking...",
        isLoading: true,
      },
    ]);

    try {
      const resp = await fetch("/api/chat-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id, // Use Clerk user ID instead of hardcoded demo ID
          messages: [...messages.filter((m) => !m.isLoading), userMsg],
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
                          isLoading: false,
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
        console.log("assistantDraftRef.current", assistantDraftRef.current);
        return [
          ...withoutDraft,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              assistantDraftRef.current ||
              "I'm sorry, I couldn't generate a response. Please try again.",
            isLoading: false,
          },
        ];
      });

      // Store AI response in MongoDB
      try {
        // Only store AI response if it has content
        if (assistantDraftRef.current && assistantDraftRef.current.trim()) {
          await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: currentConversationId,
              role: "assistant",
              content: assistantDraftRef.current,
            }),
          });
        }
      } catch (error) {
        console.error("Failed to store AI response:", error);
      }

      assistantDraftRef.current = "";
      draftIdRef.current = "";
    }
  }

  function onDelete(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function onRegenerate(id: string) {
    // Find the message to regenerate and all messages before it
    const messageIndex = messages.findIndex((m) => m.id === id);
    if (messageIndex === -1) return;

    // Keep all messages up to and including the one before the assistant response
    const messagesUpToRegenerate = messages.slice(0, messageIndex);
    setMessages(messagesUpToRegenerate);

    // Regenerate response
    setIsStreaming(true);
    draftIdRef.current = crypto.randomUUID();
    assistantDraftRef.current = "";

    // Add loading message bubble
    setMessages((prev) => [
      ...prev,
      {
        id: draftIdRef.current,
        role: "assistant",
        content: "Thinking...",
        isLoading: true,
      },
    ]);

    try {
      const resp = await fetch("/api/chat-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          messages: messagesUpToRegenerate,
          model: "gemini-2.0-flash",
        }),
      });

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }

      // Handle SSE streaming for regeneration
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let draft = "";

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          const chunk = decoder.decode(value);
          try {
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
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
                          isLoading: false,
                        },
                      ];
                    });
                  } else if (payload.error) {
                    console.error("Stream error:", payload.error);
                    throw new Error(payload.error);
                  } else if (payload.done) {
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.error("Stream parse error", e);
            throw e;
          }
        }
      }
    } catch (error) {
      console.error("Regeneration error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Sorry, I encountered an error while regenerating the response. Please try again.",
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
            isLoading: false,
          },
        ];
      });
      assistantDraftRef.current = "";
      draftIdRef.current = "";
    }
  }

  async function onEdit(id: string, content: string) {
    // Find the edited message and all messages after it
    const messageIndex = messages.findIndex((m) => m.id === id);
    if (messageIndex === -1) return;

    // Create updated messages array with the edited content
    const updatedMessages = messages.map((m, index) =>
      index === messageIndex ? { ...m, content } : m
    );

    // Remove all messages after the edited one (including the assistant's response)
    const messagesUpToEdit = updatedMessages.slice(0, messageIndex + 1);
    setMessages(messagesUpToEdit);

    // Regenerate response with the edited message
    setIsStreaming(true);
    draftIdRef.current = crypto.randomUUID();
    assistantDraftRef.current = "";

    // Add loading message bubble
    setMessages((prev) => [
      ...prev,
      {
        id: draftIdRef.current,
        role: "assistant",
        content: "Thinking...",
        isLoading: true,
      },
    ]);

    try {
      const resp = await fetch("/api/chat-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          messages: messagesUpToEdit,
          model: "gemini-2.0-flash",
        }),
      });

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }

      // Handle SSE streaming for regeneration
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let draft = "";

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          const chunk = decoder.decode(value);
          try {
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
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
                          isLoading: false,
                        },
                      ];
                    });
                  } else if (payload.error) {
                    console.error("Stream error:", payload.error);
                    throw new Error(payload.error);
                  } else if (payload.done) {
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.error("Stream parse error", e);
            throw e;
          }
        }
      }
    } catch (error) {
      console.error("Regeneration error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Sorry, I encountered an error while regenerating the response. Please try again.",
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
            isLoading: false,
          },
        ];
      });
      assistantDraftRef.current = "";
      draftIdRef.current = "";
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
        <div
          className="mx-auto w-full max-w-3xl px-3 pb-28 pt-6 space-y-4 
            h-[70vh] overflow-y-auto"
        >
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
              onRegenerate={onRegenerate}
            />
          ))}

          {/* Scroll anchor */}
          <div id={canScrollId} className="sr-only" />
        </div>
      </div>

      <Composer
        onSend={addMessage}
        disabled={isStreaming || isUploading}
        onUploadStart={() => {
          setIsUploading(true);
          // Add uploading message bubble
          const uploadId = crypto.randomUUID();
          setMessages((prev) => [
            ...prev,
            {
              id: uploadId,
              role: "user",
              content: "Uploading files...",
              isLoading: true,
            },
          ]);
        }}
        onUploadEnd={() => {
          setIsUploading(false);
          // Remove uploading message bubble
          setMessages((prev) =>
            prev.filter((m) => !m.isLoading || m.role !== "user")
          );
        }}
      />
    </div>
  );
}
