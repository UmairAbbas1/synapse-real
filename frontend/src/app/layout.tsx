import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { CommandPalette } from "@/components/ui/CommandPalette";

export const metadata: Metadata = {
  title: "Synapse — Enterprise Intelligence",
  description: "Self-hosted, air-gapped enterprise AI assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="antialiased min-h-screen bg-background text-on-background font-body-md selection:bg-primary-container/30">
        <Providers>
          <CommandPalette />
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              className: '!bg-surface/80 !backdrop-blur-[20px] !text-on-surface !border !border-outline-variant/30 !rounded-xl !shadow-lg',
              duration: 4000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
