import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Synapse — Ambient Enterprise AI",
  description: "Self-hosted, air-gapped enterprise AI assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <style>{`
          :root {
            --font-general-sans: 'General Sans', sans-serif;
            --font-jetbrains-mono: 'JetBrains Mono', monospace;
          }
        `}</style>
      </head>
      <body className="antialiased min-h-screen bg-bg-primary text-text-primary">
        <Providers>
          {children}
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              className: '!bg-surface-2 !text-text-primary !border !border-border-subtle !rounded-[12px]',
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
