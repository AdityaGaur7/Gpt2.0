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
};

type Props = {
  onSend: (text: string, files: ComposerFile[]) => void;
  disabled?: boolean;
};

export default function Composer({ onSend, disabled = false }: Props) {
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

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;
    const next = Array.from(list).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
    }));
    setFiles((prev) => [...prev, ...next]);
    if (fileInput.current) fileInput.current.value = "";
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
                <span
                  key={f.id}
                  className="text-xs rounded-md border bg-muted px-2 py-1"
                >
                  {f.name}
                </span>
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
