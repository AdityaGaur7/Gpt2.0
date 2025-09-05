"use client";

import { useEffect } from "react";

export default function ClientBody({ children, fontClasses }: { children: React.ReactNode, fontClasses: string }) {
  useEffect(() => {
    // This runs only on the client
    document.body.style.colorScheme = "dark";
    document.body.className = `${fontClasses} antialiased overflow-x-hidden min-h-dvh`;
  }, [fontClasses]);

  // Render a consistent structure for SSR
  return (
    <>
      {children}
    </>
  );
}