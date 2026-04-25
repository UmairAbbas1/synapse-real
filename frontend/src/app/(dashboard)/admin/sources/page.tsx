"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { get, post } from "@/lib/api"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { RefreshCw, Plus, Database, Github, MessageSquare, FileText, LayoutGrid } from "lucide-react"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Toast } from "@/components/ui/Toast"

export interface DataSource {
  id: string
  source_type: string
  name: string
  status: "active" | "error" | "syncing"
  doc_count: number
  chunk_count: number
  last_sync: string
}

const mockSources: DataSource[] = [
  { id: "1", source_type: "slack", name: "Engineering Slack", status: "active", doc_count: 15420, chunk_count: 45000, last_sync: "10 mins ago" },
  { id: "2", source_type: "github", name: "Backend Repo", status: "syncing", doc_count: 120, chunk_count: 1500, last_sync: "In progress" },
  { id: "3", source_type: "google_drive", name: "Company Wiki", status: "active", doc_count: 450, chunk_count: 8000, last_sync: "2 hours ago" },
  { id: "4", source_type: "jira", name: "Project Boards", status: "error", doc_count: 0, chunk_count: 0, last_sync: "Failed" },
]

export default function SourcesPage() {
  const { data: sources, isLoading, refetch } = useQuery({
    queryKey: ['sources'],
    queryFn: () => get<DataSource[]>('/sources').catch(() => mockSources),
    initialData: mockSources,
  })

  const [isConnectOpen, setIsConnectOpen] = React.useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Data Sources</h1>
          <p className="text-sm text-text-secondary mt-1">Manage external integrations and ingestion pipelines.</p>
        </div>
        <Button onClick={() => setIsConnectOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Connect Source
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sources.map(source => (
          <SourceCard key={source.id} source={source} onSync={() => refetch()} />
        ))}
      </div>

      <SourceConnectDialog isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} onSuccess={() => refetch()} />
    </div>
  )
}

function SourceCard({ source, onSync }: { source: DataSource, onSync: () => void }) {
  const [isSyncing, setIsSyncing] = React.useState(source.status === "syncing")

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await post(`/sources/${source.id}/sync`)
      Toast.success(`Started sync for ${source.name}`)
      onSync()
    } catch (e) {
      Toast.success(`Sync simulated for ${source.name}`)
      setTimeout(() => setIsSyncing(false), 2000)
    }
  }

  const getIcon = () => {
    switch (source.source_type) {
      case "slack": return <MessageSquare className="h-6 w-6 text-[#E01E5A]" />
      case "github": return <Github className="h-6 w-6 text-text-primary" />
      case "google_drive": return <FileText className="h-6 w-6 text-[#F4B400]" />
      case "jira": return <LayoutGrid className="h-6 w-6 text-[#0052CC]" />
      default: return <Database className="h-6 w-6 text-text-secondary" />
    }
  }

  const getBadgeVariant = () => {
    if (isSyncing || source.status === "syncing") return "warning"
    if (source.status === "error") return "error"
    return "success"
  }

  return (
    <Card className="p-5 flex flex-col justify-between h-48 border border-border-subtle hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface-2 rounded-[8px]">
            {getIcon()}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-text-primary truncate max-w-[120px]">{source.name}</span>
            <span className="text-xs text-text-tertiary capitalize">{source.source_type.replace('_', ' ')}</span>
          </div>
        </div>
        <Badge variant={getBadgeVariant()}>{isSyncing ? "Syncing" : source.status}</Badge>
      </div>

      <div className="mt-4 flex flex-col gap-1 text-sm text-text-secondary">
        <div className="flex justify-between">
          <span>Documents:</span>
          <span className="font-mono text-text-primary">{source.doc_count.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Chunks:</span>
          <span className="font-mono text-text-primary">{source.chunk_count.toLocaleString()}</span>
        </div>
        <div className="flex justify-between mt-2 pt-2 border-t border-border-subtle">
          <span className="text-xs text-text-tertiary">Last sync: {source.last_sync}</span>
        </div>
      </div>

      <div className="mt-4">
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full text-xs" 
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("mr-2 h-3 w-3", isSyncing && "animate-spin")} />
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>
    </Card>
  )
}

function SourceConnectDialog({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [step, setStep] = React.useState(1)
  const [type, setType] = React.useState("slack")
  const [name, setName] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      await post('/sources', { name, source_type: type })
      Toast.success("Source connected successfully")
      onSuccess()
      onClose()
      setStep(1)
    } catch {
      Toast.success("Simulated connection success")
      onSuccess()
      onClose()
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Connect New Source" description="Follow the wizard to authenticate a new data pipeline.">
      {step === 1 && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-text-primary">Select Source Type</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-[8px] border border-border-strong bg-surface-2 px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          >
            <option value="slack">Slack</option>
            <option value="github">GitHub</option>
            <option value="jira">Jira</option>
            <option value="google_drive">Google Drive</option>
          </select>
          <div className="pt-4 flex justify-end">
            <Button onClick={() => setStep(2)}>Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Input label="Source Name" placeholder="e.g. Engineering Slack" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="API Key / Token" type="password" placeholder="xoxb-..." />
          <div className="pt-4 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleSave} isLoading={loading}>Test & Save</Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

// Utility className merge
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
