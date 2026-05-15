"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { get } from "@/lib/api"
import { KnowledgeGraph3D, type GraphData } from "@/components/three/KnowledgeGraph3D"

const fallbackGraph: GraphData = {
  nodes: [
    { id: "1", label: "Person", name: "Alice", degree: 5 },
    { id: "2", label: "Document", name: "Q1 Architecture", degree: 3 },
    { id: "3", label: "Project", name: "Project Synapse", degree: 8 },
    { id: "4", label: "Team", name: "Engineering", degree: 4 },
  ],
  edges: [
    { source: "1", target: "4" },
    { source: "1", target: "2" },
    { source: "3", target: "4" },
    { source: "2", target: "3" },
  ],
}

export default function GraphPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const { data, isLoading } = useQuery({
    queryKey: ["adminGraph"],
    queryFn: () => get<GraphData>("/admin/graph").catch(() => fallbackGraph),
    initialData: fallbackGraph,
  })

  const stats = React.useMemo(() => {
    const counts = { Person: 0, Document: 0, Project: 0, Team: 0 }
    for (const node of data.nodes) {
      counts[node.label] += 1
    }
    return {
      totalNodes: data.nodes.length,
      totalEdges: data.edges.length,
      ...counts,
    }
  }, [data])

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] relative gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="rounded-[10px] border border-border-medium bg-surface-1 p-3">
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary">Nodes</p>
          <p className="text-lg font-bold text-text-primary">{stats.totalNodes}</p>
        </div>
        <div className="rounded-[10px] border border-border-medium bg-surface-1 p-3">
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary">Edges</p>
          <p className="text-lg font-bold text-text-primary">{stats.totalEdges}</p>
        </div>
        <div className="rounded-[10px] border border-border-medium bg-surface-1 p-3">
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary">People</p>
          <p className="text-lg font-bold text-text-primary">{stats.Person}</p>
        </div>
        <div className="rounded-[10px] border border-border-medium bg-surface-1 p-3">
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary">Docs</p>
          <p className="text-lg font-bold text-text-primary">{stats.Document}</p>
        </div>
        <div className="rounded-[10px] border border-border-medium bg-surface-1 p-3">
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary">Projects</p>
          <p className="text-lg font-bold text-text-primary">{stats.Project}</p>
        </div>
        <div className="rounded-[10px] border border-border-medium bg-surface-1 p-3">
          <p className="text-[10px] uppercase tracking-widest text-text-tertiary">Teams</p>
          <p className="text-lg font-bold text-text-primary">{stats.Team}</p>
        </div>
      </div>

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
        <KnowledgeGraph3D data={data} searchQuery={searchQuery} isLoading={isLoading} />
      </div>
    </div>
  )
}
