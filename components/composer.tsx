"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Paperclip, Send } from "lucide-react";

export type ComposerFile = {
  id: string;
  name: string;
  url?: string;
  type?: string;
};

type Props = {
  onSend: (text: string, files: ComposerFile[]) => void;
  disabled?: boolean;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
};

export default function Composer({
  onSend,
  disabled = false,
  onUploadStart,
  onUploadEnd,
}: Props) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<ComposerFile[]>([]);

  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = Math.min(ref.current.scrollHeight, 300) + "px";
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const text = value.trim();
    if (!text && files.length === 0) return;
    if (disabled) return;
    onSend(text, files);
    setValue("");
    setFiles([]);
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;

    onUploadStart?.();
    const newFiles: ComposerFile[] = [];

    for (const file of Array.from(list)) {
      // Validate file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 20MB.`);
        continue;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported.`);
        continue;
      }

      // Upload file to get URL
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();

        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: result.url,
          type: file.type,
        });
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        alert(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInput.current) fileInput.current.value = "";
    onUploadEnd?.();
  }

  return (
    <div className="sticky bottom-0 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto w-full max-w-3xl px-3 py-3">
        <div className={cn("rounded-xl border bg-background shadow-sm p-2")}>
          <div className="flex items-end gap-2">
            <input
              ref={fileInput}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.txt"
              className="sr-only"
              onChange={onPickFiles}
              aria-label="Upload files"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Attach files"
              onClick={() => fileInput.current?.click()}
              disabled={disabled}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Textarea
              ref={ref}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message ChatGPT"
              aria-label="Message input"
              className="flex-1 min-h-[44px] max-h-[300px] resize-none border-0 focus-visible:ring-0 px-0"
              disabled={disabled}
            />
            <Button
              type="button"
              onClick={submit}
              aria-label="Send message"
              disabled={disabled}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
          {files.length > 0 && (
            <div
              className="px-2 pt-2 flex flex-wrap gap-2"
              aria-label="Attached files"
            >
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 text-xs rounded-md border bg-muted px-2 py-1"
                >
                  <span>{f.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((prev) =>
                        prev.filter((file) => file.id !== f.id)
                      )
                    }
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${f.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="px-2 pt-2 text-[11px] text-muted-foreground">
            Press Enter to send • Shift+Enter for newline
          </p>
        </div>
      </div>
    </div>
  );
}
