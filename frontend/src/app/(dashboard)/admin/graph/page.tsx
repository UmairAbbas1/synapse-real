"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, X } from "lucide-react"
import { get } from "@/lib/api"
import { KnowledgeGraph3D, type GraphData, type GraphNode } from "@/components/three/KnowledgeGraph3D"

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

const LABELS = ["Person", "Document", "Project", "Team"] as const
type NodeLabel = (typeof LABELS)[number]

export default function GraphPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [enabledLabels, setEnabledLabels] = React.useState<Record<NodeLabel, boolean>>({
    Person: true,
    Document: true,
    Project: true,
    Team: true,
  })
  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminGraph"],
    queryFn: () => get<GraphData>("/admin/graph"),
    initialData: fallbackGraph,
    retry: 1,
  })

  const filteredData = React.useMemo(() => {
    const allowedLabels = new Set<NodeLabel>(LABELS.filter((label) => enabledLabels[label]))
    const nodes = data.nodes.filter((node): node is GraphNode => allowedLabels.has(node.label))
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = data.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    return { nodes, edges }
  }, [data.edges, data.nodes, enabledLabels])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const matchCount = React.useMemo(() => {
    if (!normalizedQuery) return 0
    return filteredData.nodes.filter((node) => node.name.toLowerCase().includes(normalizedQuery)).length
  }, [filteredData.nodes, normalizedQuery])
  const allLabelsEnabled = LABELS.every((label) => enabledLabels[label])

  const stats = React.useMemo(() => {
    const counts = { Person: 0, Document: 0, Project: 0, Team: 0 }
    for (const node of filteredData.nodes) {
      counts[node.label] += 1
    }
    return {
      totalNodes: filteredData.nodes.length,
      totalEdges: filteredData.edges.length,
      ...counts,
    }
  }, [filteredData.edges.length, filteredData.nodes])

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] gap-4">
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

      {isError && (
        <div className="rounded-[10px] border border-border-strong bg-surface-1 px-4 py-2 text-xs text-text-secondary">
          Live graph data is unavailable. Showing the last available sample until the service recovers.
        </div>
      )}

      <div className="rounded-[12px] border border-border-subtle bg-surface-1/40 p-3">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2 bg-surface-1/80 backdrop-blur-md rounded-[12px] border border-border-strong px-3 py-3">
            <Search className="h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Highlight nodes by name..."
              className="flex-1 bg-transparent text-sm text-text-primary focus:outline-none placeholder:text-text-tertiary"
            />
            {normalizedQuery ? (
              <span className="text-[11px] text-text-tertiary">
                {matchCount === 0 ? "No matches" : `${matchCount} match${matchCount === 1 ? "" : "es"}`}
              </span>
            ) : null}
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-[6px] p-1 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {LABELS.map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={enabledLabels[label]}
              onClick={() => {
                setEnabledLabels((prev) => ({ ...prev, [label]: !prev[label] }))
              }}
              className={`rounded-[6px] border px-3 py-1.5 text-xs transition-colors ${
                enabledLabels[label]
                  ? "border-accent-primary text-text-primary bg-accent-primary/10 hover:border-accent-primary hover:text-text-primary"
                  : "border-border-medium text-text-tertiary hover:border-border-strong hover:text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            disabled={allLabelsEnabled}
            onClick={() =>
              setEnabledLabels({
                Person: true,
                Document: true,
                Project: true,
                Team: true,
              })
            }
            className="rounded-[6px] border border-border-medium px-3 py-1.5 text-xs text-text-tertiary transition-colors hover:border-accent-primary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset filters
          </button>
          <p className="text-xs text-text-tertiary">
            Showing {stats.totalNodes} nodes / {stats.totalEdges} edges
          </p>
        </div>
      </div>

      <div className="flex-1 w-full rounded-[12px] overflow-hidden">
        <KnowledgeGraph3D data={filteredData} searchQuery={searchQuery} isLoading={isLoading} />
      </div>
    </div>
  )
}
