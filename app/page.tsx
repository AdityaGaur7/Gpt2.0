"use client";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-pretty">Chatgpt 2.0</h1>
          <p className="text-muted-foreground text-lg">
            Your AI-powered task management assistant
          </p>
        </div>

        <SignedIn>
          <div className="space-y-4">
            <p className="text-green-600 font-medium">✅ Youre signed in!</p>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-base font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
            >
              Start Chatting
            </Link>
          </div>
        </SignedIn>

        <SignedOut>
          <div className="space-y-4">
            <p className="text-gray-600">
              Please sign in to access the chat interface
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-md bg-gray-100 text-gray-900 px-6 py-3 text-base font-medium hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
              >
                View Demo
              </Link>
            </div>
          </div>
        </SignedOut>
      </div>
    </main>
  );
}
