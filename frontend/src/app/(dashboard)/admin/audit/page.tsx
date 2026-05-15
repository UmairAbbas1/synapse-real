"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { List, type RowComponentProps } from "react-window"
import toast from "react-hot-toast"
import { useAuthStore } from "@/store/auth-store"
import { getApiClient } from "@/lib/api-client"
import type { AuditLog, AdminUser, JsonValue } from "@/lib/api-client"
import { ApiError } from "@/lib/api-client"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Avatar } from "@/components/ui/Avatar"
import { Download } from "lucide-react"
const LIST_ROW_H = 72
const LIST_HEIGHT = 520

function extractIp(details: Record<string, JsonValue>): string {
  const a = details["client_ip"]
  const b = details["ip_address"]
  if (typeof a === "string") return a
  if (typeof b === "string") return b
  return "—"
}

interface AuditRowProps {
  items: AuditLog[]
  userEmailById: Map<string, string>
  onSelect: (log: AuditLog) => void
}

function AuditRow({
  index,
  style,
  ariaAttributes,
  items,
  userEmailById,
  onSelect,
}: RowComponentProps<AuditRowProps>) {
  const it = items[index]
  if (!it) return null
  const email = userEmailById.get(it.user_id) ?? it.user_id
  const ip = extractIp(it.details)
  return (
    <div style={style} className="border-b border-border-subtle px-3" {...ariaAttributes}>
      <button
        type="button"
        className="flex h-full w-full items-center gap-3 text-left transition-colors hover:bg-surface-2"
        onClick={() => onSelect(it)}
      >
        <span className="w-40 shrink-0 text-text-tertiary">
          {new Date(it.created_at).toLocaleString()}
        </span>
        <Avatar initials={(email || "?").charAt(0).toUpperCase()} className="h-8 w-8 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-text-primary">{email}</span>
        <Badge variant={actionVariant(it.action)} className="shrink-0">
          {it.action}
        </Badge>
        <span className="hidden w-24 shrink-0 text-text-secondary md:block">{it.resource_type}</span>
        <span className="hidden w-28 shrink-0 text-text-tertiary lg:block">{ip}</span>
      </button>
    </div>
  )
}

function actionVariant(action: string): "default" | "success" | "warning" | "error" | "info" {
  const a = action.toLowerCase()
  if (a.includes("fail") || a.includes("denied")) return "error"
  if (a.includes("login")) return "info"
  if (a.includes("delete") || a.includes("remove")) return "warning"
  return "success"
}

export default function AdminAuditPage() {
  const router = useRouter()
  const { user, isHydrated } = useAuthStore()
  const isAdmin = (user?.role || "").toLowerCase() === "admin"
  const [items, setItems] = React.useState<AuditLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [actionFilter, setActionFilter] = React.useState("")
  const [userFilter, setUserFilter] = React.useState("")
  const [from, setFrom] = React.useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [userDirectory, setUserDirectory] = React.useState<AdminUser[]>([])
  const [knownActions, setKnownActions] = React.useState<string[]>([])
  const [detailLog, setDetailLog] = React.useState<AuditLog | null>(null)

  const userEmailById = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const u of userDirectory) {
      m.set(u.id, u.email)
    }
    return m
  }, [userDirectory])

  const load = React.useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const fromDt = new Date(`${from}T00:00:00.000Z`).toISOString()
      const toDt = new Date(`${to}T23:59:59.999Z`).toISOString()
      const res = await getApiClient().listAuditLogs({
        page: 1,
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(userFilter ? { user_id: userFilter } : {}),
        from_dt: fromDt,
        to_dt: toDt,
      })
      setItems(res.items)
      setKnownActions((prev) => {
        const next = new Set(prev)
        for (const it of res.items) next.add(it.action)
        return Array.from(next).sort()
      })
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load audit log")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [actionFilter, userFilter, from, to])

  React.useEffect(() => {
    if (!isHydrated) return
    if (!isAdmin) {
      toast.error("Admin access required")
      router.replace("/chat")
      return
    }
    void (async () => {
      try {
        const u = await getApiClient().listUsers({ page: 1, size: 100 })
        setUserDirectory(u.items)
      } catch {
        setUserDirectory([])
      }
    })()
  }, [isHydrated, isAdmin, router])

  React.useEffect(() => {
    if (!isHydrated || !isAdmin) return
    void load()
  }, [isHydrated, isAdmin, load])

  const exportCsv = () => {
    const header = ["created_at", "user_id", "email", "action", "resource_type", "ip", "details_json"]
    const lines = items.map((it) => {
      const email = userEmailById.get(it.user_id) ?? it.user_id
      const ip = extractIp(it.details)
      const detailsJson = JSON.stringify(it.details)
      const cells = [it.created_at, it.user_id, email, it.action, it.resource_type, ip, detailsJson]
      return cells.map(csvEscape).join(",")
    })
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "audit-export.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isHydrated || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Audit log</h1>
          <p className="mt-1 text-sm text-text-secondary">Immutable access and activity records.</p>
        </div>
        <Button variant="secondary" className="flex items-center gap-2" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-[12px] border border-border-medium bg-surface-1 p-4 lg:flex-row lg:flex-wrap lg:items-end">
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="min-w-[140px] border-b border-border-strong bg-transparent py-2 text-sm focus:border-accent-primary focus:outline-none"
          >
            <option value="">All</option>
            {knownActions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">User</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="min-w-[200px] border-b border-border-strong bg-transparent py-2 text-sm focus:border-accent-primary focus:outline-none"
          >
            <option value="">All users</option>
            {userDirectory.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border-b border-border-strong bg-transparent py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border-b border-border-strong bg-transparent py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        />
        </div>
        <Button type="button" onClick={() => void load()} className="lg:ml-2">
          Apply
        </Button>
      </div>

      {err ? (
        <div className="rounded-[12px] border border-status-error/30 bg-status-error/10 px-4 py-3 text-sm text-status-error">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-tertiary">No rows in this range.</p>
      ) : (
        <div className="rounded-[12px] border border-border-medium bg-bg-secondary">
          <List<AuditRowProps>
            className="font-mono text-xs"
            rowHeight={LIST_ROW_H}
            rowCount={items.length}
            rowProps={{ items, userEmailById, onSelect: setDetailLog }}
            defaultHeight={LIST_HEIGHT}
            style={{ width: "100%", height: LIST_HEIGHT }}
            rowComponent={AuditRow}
          />
        </div>
      )}

      <Dialog
        isOpen={detailLog !== null}
        onClose={() => setDetailLog(null)}
        title="Audit details"
        className="max-w-2xl"
      >
        {detailLog ? (
          <pre className="max-h-[60vh] overflow-auto rounded-[8px] border border-border-medium bg-bg-primary p-4 font-mono text-xs text-text-primary">
            {JSON.stringify(detailLog.details, null, 2)}
          </pre>
        ) : null}
      </Dialog>
    </div>
  )
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
