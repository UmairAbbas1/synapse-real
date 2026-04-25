"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { get } from "@/lib/api"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Search } from "lucide-react"

interface AuditLog {
  id: string
  timestamp: string
  user_email: string
  action: string
  resource_type: string
  ip_address: string
  status: "success" | "failure"
}

const mockLogs: AuditLog[] = [
  { id: "1", timestamp: "2024-05-10T14:30:00Z", user_email: "admin@company.com", action: "UPDATE_ROLE", resource_type: "USER", ip_address: "192.168.1.100", status: "success" },
  { id: "2", timestamp: "2024-05-10T14:28:12Z", user_email: "user@company.com", action: "QUERY_VECTOR", resource_type: "SYSTEM", ip_address: "10.0.0.55", status: "success" },
  { id: "3", timestamp: "2024-05-10T14:15:00Z", user_email: "unknown", action: "LOGIN_FAILED", resource_type: "AUTH", ip_address: "203.0.113.42", status: "failure" },
]

export default function AuditPage() {
  const [search, setSearch] = React.useState("")
  
  const { data: logs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => get<AuditLog[]>('/audit').catch(() => mockLogs),
    initialData: mockLogs,
  })

  const filteredLogs = logs.filter(l => 
    l.user_email.includes(search) || l.action.includes(search.toUpperCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Audit Logs</h1>
          <p className="text-sm text-text-secondary mt-1">Immutable record of system actions and access events.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-surface-1 p-4 rounded-[12px] border border-border-subtle">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or action..."
            className="w-full rounded-[8px] border border-border-strong bg-bg-primary pl-9 pr-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User / IP</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map(log => (
              <TableRow key={log.id}>
                <TableCell>
                  <span className="font-mono text-xs text-text-secondary">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text-primary">{log.user_email}</span>
                    <span className="font-mono text-xs text-text-tertiary">{log.ip_address}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-text-secondary">{log.action}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-secondary">{log.resource_type}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={log.status === "success" ? "success" : "error"}>{log.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
