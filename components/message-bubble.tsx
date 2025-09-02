"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Copy, Edit2, Trash2, Check, X } from "lucide-react";
import Image from "next/image";

export type Message = {
  id: string;
  role: "user" | "assistant" | "assistant-draft";
  content: string;
  files?: { name: string; url: string; type: string }[];
};

type Props = {
  message: Message;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
};

export default function MessageBubble({ message, onDelete, onEdit }: Props) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isEditing && areaRef.current) {
      areaRef.current.style.height = "0px";
      areaRef.current.style.height = `${areaRef.current.scrollHeight}px`;
      areaRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div
      className={cn(
        "group relative w-full animate-in fade-in-50 duration-300",
        message.role === "user" ? "flex justify-end" : "flex justify-start"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          "max-w-2xl rounded-lg px-4 py-3 text-sm leading-relaxed",
          message.role === "user"
            ? "bg-muted text-foreground"
            : "bg-card text-foreground shadow-sm border"
        )}
      >
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              ref={areaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Edit message"
              className="min-h-[96px] resize-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setDraft(message.content);
                }}
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  onEdit(message.id, draft.trim());
                }}
                aria-label="Save edit"
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap text-pretty">{message.content}</p>
            {message.files && message.files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {message.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                  >
                    <span className="text-xs text-muted-foreground">
                      {file.name}
                    </span>
                    {file.type.startsWith("image/") && (
                      <Image
                        src={file.url}
                        alt={file.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!isEditing && hovered && (
        <div
          className={cn(
            "absolute -top-3",
            message.role === "user" ? "right-2" : "left-2"
          )}
          aria-label="Message actions"
        >
          <div className="flex items-center gap-1 rounded-md bg-background/95 border shadow-sm px-1.5 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Copy message"
              onClick={() => navigator.clipboard.writeText(message.content)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            {message.role === "user" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Edit message"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Delete message"
              onClick={() => onDelete(message.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
