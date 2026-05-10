"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { formatDistanceToNow } from "date-fns"
import {
  Database,
  Github,
  MessageSquare,
  LayoutGrid,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  ClipboardList,
  X,
} from "lucide-react"
import { useAuthStore } from "@/store/auth-store"
import { getApiClient } from "@/lib/api-client"
import type { Source, SourceJob } from "@/lib/api-client"
import { ApiError } from "@/lib/api-client"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Dialog } from "@/components/ui/Dialog"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

const PERMISSION_TAGS = ["engineering", "hr", "pm", "public", "finance", "admin"]

export default function AdminSourcesPage() {
  const router = useRouter()
  const { user, isHydrated } = useAuthStore()
  const [sources, setSources] = React.useState<Source[] | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [jobsOpen, setJobsOpen] = React.useState(false)
  const [jobsSource, setJobsSource] = React.useState<Source | null>(null)
  const [jobs, setJobs] = React.useState<SourceJob[]>([])
  const [jobsLoading, setJobsLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getApiClient().listSources()
      setSources(data)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load sources"
      setLoadError(msg)
      setSources([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!isHydrated) return
    if (user?.role !== "ADMIN") {
      toast.error("Admin access required")
      router.replace("/chat")
      return
    }
    void load()
  }, [isHydrated, user?.role, router, load])

  const openJobs = async (s: Source) => {
    setJobsSource(s)
    setJobsOpen(true)
    setJobsLoading(true)
    try {
      const j = await getApiClient().listSourceJobs(s.id)
      setJobs(j)
    } catch {
      setJobs([])
      toast.error("Could not load jobs")
    } finally {
      setJobsLoading(false)
    }
  }

  const refreshJobs = React.useCallback(async () => {
    if (!jobsSource) return
    try {
      const j = await getApiClient().listSourceJobs(jobsSource.id)
      setJobs(j)
    } catch {
      /* ignore */
    }
  }, [jobsSource])

  React.useEffect(() => {
    if (!jobsOpen || !jobsSource) return
    const tick = () => void refreshJobs()
    const hasActive = jobs.some((j) => j.status === "running" || j.status === "pending")
    if (!hasActive) return
    const id = window.setInterval(tick, 5000)
    return () => window.clearInterval(id)
  }, [jobsOpen, jobsSource, jobs, refreshJobs])

  if (!isHydrated || user?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Data sources</h1>
          <p className="mt-1 text-sm text-text-secondary">Connect and sync knowledge connectors.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Source
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-[12px] border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm text-status-error">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(sources ?? []).map((s) => (
            <SourceCard
              key={s.id}
              source={s}
              onSync={async () => {
                try {
                  await getApiClient().syncSource(s.id)
                  toast.success("Sync queued")
                  void load()
                } catch (e) {
                  toast.error(e instanceof ApiError ? e.message : "Sync failed")
                }
              }}
              onJobs={() => void openJobs(s)}
              onDelete={async () => {
                if (!confirm(`Disconnect ${s.name}?`)) return
                try {
                  await getApiClient().deleteSource(s.id)
                  toast.success("Source disconnected")
                  void load()
                } catch (e) {
                  toast.error(e instanceof ApiError ? e.message : "Delete failed")
                }
              }}
            />
          ))}
        </div>
      )}

      <AddSourceDialog
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false)
          void load()
        }}
      />

      {jobsOpen && jobsSource ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-bg-primary/60 backdrop-blur-sm"
          role="presentation"
        >
          <div className="flex h-full w-full max-w-md flex-col border-l border-border-medium bg-bg-secondary shadow-none">
            <div className="flex items-center justify-between border-b border-border-subtle p-4">
              <h2 className="font-bold text-text-primary">Ingestion jobs</h2>
              <button
                type="button"
                className="rounded p-2 text-text-secondary hover:bg-surface-2"
                onClick={() => setJobsOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-4 text-sm text-text-secondary">{jobsSource.name}</p>
              {jobsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
                </div>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-text-tertiary">No jobs yet.</p>
              ) : (
                <ul className="space-y-3">
                  {jobs.map((j) => (
                    <li
                      key={j.id}
                      className="rounded-[12px] border border-border-medium bg-surface-1 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <JobStatusPill status={j.status} />
                        <span className="font-mono text-xs text-text-tertiary">
                          {j.chunks_processed} chunks
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-text-secondary">
                        Started:{" "}
                        {j.started_at
                          ? formatDistanceToNow(new Date(j.started_at), { addSuffix: true })
                          : "—"}
                      </p>
                      {j.error_message ? (
                        <p className="mt-1 text-xs text-status-error">{j.error_message}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function JobStatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  if (s === "running" || s === "pending")
    return (
      <Badge variant="warning" className="flex items-center gap-1">
        <RefreshCw className="h-3 w-3 animate-spin" />
        {status}
      </Badge>
    )
  if (s === "failed" || s === "error")
    return <Badge variant="error">{status}</Badge>
  return <Badge variant="success">{status}</Badge>
}

function typeIcon(sourceType: string) {
  const t = sourceType.toLowerCase()
  if (t === "slack") return <MessageSquare className="h-6 w-6 text-status-error" />
  if (t === "github") return <Github className="h-6 w-6 text-text-primary" />
  if (t === "jira") return <LayoutGrid className="h-6 w-6 text-info" />
  if (t === "gdrive" || t === "google_drive") return <FileText className="h-6 w-6 text-status-warning" />
  if (t === "mock") return <Database className="h-6 w-6 text-accent-primary" />
  return <Database className="h-6 w-6 text-text-secondary" />
}

function SourceCard({
  source,
  onSync,
  onJobs,
  onDelete,
}: {
  source: Source
  onSync: () => Promise<void>
  onJobs: () => void
  onDelete: () => Promise<void>
}) {
  const [busy, setBusy] = React.useState(false)
  const st = source.status.toLowerCase()

  return (
    <div className="flex h-full flex-col rounded-[12px] border border-border-medium bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-[8px] border border-border-subtle bg-surface-2 p-2">{typeIcon(source.source_type)}</div>
          <div className="min-w-0">
            <h3 className="truncate font-bold text-text-primary">{source.name}</h3>
            <p className="text-xs capitalize text-text-tertiary">{source.source_type}</p>
          </div>
        </div>
        {st === "active" ? (
          <Badge variant="success">connected</Badge>
        ) : st === "paused" ? (
          <Badge variant="warning">paused</Badge>
        ) : (
          <Badge variant="error">{source.status}</Badge>
        )}
      </div>

      <p className="mt-4 text-xs text-text-secondary">
        Updated {formatDistanceToNow(new Date(source.updated_at), { addSuffix: true })}
      </p>
      <p className="mt-1 text-xs text-text-tertiary">
        Tags: {source.default_permission_tags.join(", ") || "—"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="text-xs"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void onSync().finally(() => setBusy(false))
          }}
        >
          <RefreshCw className={cn("mr-1 h-3 w-3", busy && "animate-spin")} />
          Sync Now
        </Button>
        <Button variant="secondary" size="sm" className="text-xs" onClick={onJobs}>
          <ClipboardList className="mr-1 h-3 w-3" />
          View Jobs
        </Button>
        <Button
          variant="danger"
          size="sm"
          className="text-xs"
          onClick={() => void onDelete()}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Disconnect
        </Button>
      </div>
    </div>
  )
}

function AddSourceDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [sourceType, setSourceType] = React.useState("mock")
  const [name, setName] = React.useState("")
  const [credentialsJson, setCredentialsJson] = React.useState("{}")
  const [cron, setCron] = React.useState("")
  const [tag, setTag] = React.useState("engineering")
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const submit = async () => {
    setFormError(null)
    let credentials: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(credentialsJson || "{}")
      credentials =
        typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {}
    } catch {
      setFormError("Credentials must be valid JSON.")
      return
    }
    setSubmitting(true)
    try {
      await getApiClient().createSource({
        source_type: sourceType,
        name: name.trim() || "Untitled",
        credentials,
        ...(cron.trim() ? { sync_schedule: cron.trim() } : {}),
        default_permission_tag: tag,
      })
      toast.success("Source created")
      onCreated()
      setName("")
      setCredentialsJson("{}")
      setCron("")
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Create failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add source" description="Register a new connector.">
      {formError ? (
        <p className="mb-3 text-sm text-status-error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-secondary">Type</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="w-full rounded-[6px] border border-b border-border-strong bg-transparent py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          >
            <option value="mock">mock</option>
            <option value="github">github</option>
            <option value="slack">slack</option>
            <option value="jira">jira</option>
            <option value="gdrive">gdrive</option>
          </select>
        </div>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering docs" />
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-secondary">Credentials (JSON)</label>
          <textarea
            value={credentialsJson}
            onChange={(e) => setCredentialsJson(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-[6px] border border-border-strong bg-bg-primary p-3 font-mono text-xs text-text-primary focus:border-accent-primary focus:outline-none"
          />
        </div>
        <Input
          label="Sync schedule (cron)"
          value={cron}
          onChange={(e) => setCron(e.target.value)}
          placeholder="0 * * * *"
        />
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-secondary">Permission tag</label>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full border-b border-border-strong bg-transparent py-2 text-sm focus:border-accent-primary focus:outline-none"
          >
            {PERMISSION_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" isLoading={submitting} onClick={() => void submit()}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
