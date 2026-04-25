"use client"

import * as React from "react"
import { motion } from "framer-motion"

export function ThinkingIndicator() {
  const dotVariants = {
    hidden: { y: 0 },
    visible: { y: -8 },
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-sm font-medium text-text-secondary mr-2">Synapse is thinking</span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_8px_var(--accent-glow)]"
            variants={dotVariants}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  )
}
