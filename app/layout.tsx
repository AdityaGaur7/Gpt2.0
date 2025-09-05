import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import HeaderClient from "../components/header-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// metadata cannot be used in a Client Component layout

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body className="antialiased overflow-x-hidden min-h-dvh">
        <Providers>
          <header className="p-4 border-b overflow-hidden">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold">Chatgpt 2.0</h1>
              <HeaderClient />
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
