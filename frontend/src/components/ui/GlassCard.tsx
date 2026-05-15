"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "flat" | "elevated" | "3d";
  blur?: boolean;
}

export const GlassCard = ({
  children,
  className,
  variant = "elevated",
  blur = true,
  ...props
}: GlassCardProps) => {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-border-medium transition-all duration-500 ease-out",
        blur && "glass-effect",
        variant === "elevated" && "shadow-md hover:shadow-lg",
        variant === "3d" && "card-3d shadow-lg",
        variant === "flat" && "bg-bg-secondary",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
      {/* Subtle shine effect */}
      <div className="absolute inset-0 rounded-[12px] pointer-events-none bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  );
};
