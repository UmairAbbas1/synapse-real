import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { CommandPalette } from "@/components/ui/CommandPalette";

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
    <html lang="en" data-theme="light">
      <body className="antialiased min-h-screen bg-bg-primary text-text-primary font-sans selection:bg-accent-muted selection:text-accent-primary">
        <Providers>
          <CommandPalette />
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              className: '!bg-glass !backdrop-blur-md !text-text-primary !border !border-border-medium !rounded-[12px] !shadow-lg',
              duration: 4000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
