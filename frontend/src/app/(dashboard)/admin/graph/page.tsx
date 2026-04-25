"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { KnowledgeGraph3D } from "@/components/three/KnowledgeGraph3D"

export default function GraphPage() {
  const [searchQuery, setSearchQuery] = React.useState("")

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-md">
        <div className="relative flex items-center bg-surface-1/80 backdrop-blur-md rounded-[12px] border border-border-strong shadow-lg">
          <Search className="absolute left-3 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Highlight nodes by name..."
            className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-text-primary focus:outline-none placeholder:text-text-tertiary"
          />
        </div>
      </div>
      
      <div className="flex-1 w-full rounded-[12px] overflow-hidden">
        <KnowledgeGraph3D />
      </div>
    </div>
  )
}
