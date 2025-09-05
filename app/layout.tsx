
import "./globals.css";
import Providers from "./providers";
import HeaderClient from "../components/header-client";


// metadata cannot be used in a Client Component layout

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body className="antialiased overflow-x-hidden min-h-dvh vsc-initialized">
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
