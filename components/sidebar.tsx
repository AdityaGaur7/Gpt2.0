"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Menu, Plus, LogOut, Sun, Trash2 } from "lucide-react";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<
    { _id: string; title: string; updatedAt: Date }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/conversations", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setConversations(data || []);
      } catch {
        // ignore
      }
    }
    load();
    function onRefresh() {
      load();
    }
    window.addEventListener("refresh-history", onRefresh as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("refresh-history", onRefresh as EventListener);
    };
  }, []);

  function selectConversation(conversationId: string) {
    window.dispatchEvent(
      new CustomEvent("conversation-select", {
        detail: { conversationId },
      })
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="h-dvh flex flex-col">
        <div className="p-3 border-b flex items-center gap-2">
          <Button
            variant="default"
            className="w-full justify-start gap-2"
            aria-label="New chat"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("new-chat"));
            }}
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav aria-label="Chat history" className="px-2 py-3 space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation._id}
                className={cn(
                  "w-full text-left rounded-md px-3 py-2 text-sm hover:bg-muted truncate"
                )}
                aria-label={`Open ${conversation.title}`}
                onClick={() => selectConversation(conversation._id)}
              >
                {conversation.title}
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No conversations yet
              </div>
            )}
          </nav>
        </div>

        <div className="mt-auto border-t">
          <div className="p-3 space-y-2">
            <Input placeholder="Search" aria-label="Search chats" />
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" aria-label="Toggle light mode">
                <Sun className="h-4 w-4 mr-2" />
                Light mode
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete conversations"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile header and drawer-like sidebar */}
      <div className="md:hidden">
        <div className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-sm font-medium">Chat</div>
            <div className="ml-auto">
              <Button
                variant="default"
                size="sm"
                aria-label="New chat mobile"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent("new-chat"));
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </div>
        </div>

        {open && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-background border-r shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b flex items-center gap-2">
                <Button
                  variant="default"
                  className="w-full justify-start gap-2"
                  aria-label="New chat"
                >
                  <Plus className="h-4 w-4" />
                  New chat
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <nav
                  aria-label="Chat history mobile"
                  className="px-2 py-3 space-y-1"
                >
                  {conversations.map((conversation) => (
                    <button
                      key={conversation._id}
                      className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-muted truncate"
                      aria-label={`Open ${conversation.title}`}
                      onClick={() => {
                        setOpen(false);
                        selectConversation(conversation._id);
                      }}
                    >
                      {conversation.title}
                    </button>
                  ))}
                  {conversations.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No conversations yet
                    </div>
                  )}
                </nav>
              </div>
              <div className="mt-auto border-t p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent"
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
