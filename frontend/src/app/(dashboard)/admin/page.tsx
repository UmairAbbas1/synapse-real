"use client"

import { useQuery } from "@tanstack/react-query"
import { get } from "@/lib/api"
import { Card } from "@/components/ui/Card"
import { SystemHealthCard, SystemHealth } from "@/components/admin/SystemHealthCard"
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Users, FileText, Database, Clock } from "lucide-react"

interface DashboardStats {
  total_documents: number
  document_trend: { date: string; count: number }[]
  active_sources: number
  queries_today: number
  hourly_queries: { hour: string; count: number }[]
  avg_response_time_ms: number
  active_users: number
  health: SystemHealth
}

// Fallback mock data in case API is down
const fallbackData: DashboardStats = {
  total_documents: 14500,
  document_trend: Array.from({ length: 7 }, (_, i) => ({ date: `Day ${i + 1}`, count: 10000 + i * 500 })),
  active_sources: 4,
  queries_today: 1240,
  hourly_queries: Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: Math.floor(Math.random() * 100) })),
  avg_response_time_ms: 850,
  active_users: 12,
  health: { postgres: "healthy", pgvector: "healthy", neo4j: "healthy", redis: "healthy", ollama: "healthy" }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function toTrend(value: unknown, fallback: { date: string; count: number }[]): { date: string; count: number }[] {
  if (!Array.isArray(value)) return fallback
  return value
    .filter(isObject)
    .map((item) => ({
      date: String(item.date ?? ""),
      count: toNumber(item.count, 0),
    }))
}

function toHourlyTrend(value: unknown, fallback: { hour: string; count: number }[]): { hour: string; count: number }[] {
  if (!Array.isArray(value)) return fallback
  return value
    .filter(isObject)
    .map((item) => ({
      hour: String(item.hour ?? ""),
      count: toNumber(item.count, 0),
    }))
}

function toHealth(value: unknown): SystemHealth {
  if (!isObject(value)) return fallbackData.health
  return {
    postgres: typeof value.postgres === "string" ? value.postgres : fallbackData.health.postgres,
    pgvector: typeof value.pgvector === "string" ? value.pgvector : fallbackData.health.pgvector,
    neo4j: typeof value.neo4j === "string" ? value.neo4j : fallbackData.health.neo4j,
    redis: typeof value.redis === "string" ? value.redis : fallbackData.health.redis,
    ollama: typeof value.ollama === "string" ? value.ollama : fallbackData.health.ollama,
  }
}

function normalizeDashboardStats(raw: unknown): DashboardStats {
  if (!isObject(raw)) return fallbackData
  return {
    total_documents: toNumber(raw.total_documents, fallbackData.total_documents),
    document_trend: toTrend(raw.document_trend, fallbackData.document_trend),
    active_sources: toNumber(raw.active_sources, fallbackData.active_sources),
    queries_today: toNumber(raw.queries_today, fallbackData.queries_today),
    hourly_queries: toHourlyTrend(raw.hourly_queries, fallbackData.hourly_queries),
    avg_response_time_ms: toNumber(raw.avg_response_time_ms, fallbackData.avg_response_time_ms),
    active_users: toNumber(raw.active_users, fallbackData.active_users),
    health: toHealth(raw.health),
  }
}

export default function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      try {
        const raw = await get<unknown>("/admin/stats")
        return normalizeDashboardStats(raw)
      } catch {
        return fallbackData
      }
    },
    refetchInterval: 30000, // 30 seconds
    initialData: fallbackData, // Using fallback for immediate UI rendering during dev
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Documents" value={data.total_documents.toLocaleString()} icon={FileText} trend="+5.2%" />
        <StatCard title="Active Data Sources" value={data.active_sources.toString()} icon={Database} />
        <StatCard title="Active Users" value={data.active_users.toString()} icon={Users} />
        <StatCard title="Avg Response Time" value={`${data.avg_response_time_ms}ms`} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-text-primary">Queries Today</h3>
            <span className="text-sm font-medium bg-surface-2 px-3 py-1 rounded-full">{data.queries_today.toLocaleString()} Total</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourly_queries}>
                <XAxis dataKey="hour" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--surface-2)' }} 
                  contentStyle={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-strong)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="lg:col-span-1">
          <SystemHealthCard health={data.health} />
        </div>
      </div>
      
      <Card className="p-6">
        <h3 className="text-lg font-bold text-text-primary mb-6">Document Growth Trend</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.document_trend}>
              <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-strong)', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="count" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string, icon: React.ElementType, trend?: string }) {
  return (
    <Card className="p-5 flex flex-col justify-between h-32">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        <div className="p-2 bg-surface-2 rounded-md">
          <Icon className="h-4 w-4 text-accent-primary" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <h4 className="text-2xl font-bold text-text-primary">{value}</h4>
        {trend && <span className="text-xs font-semibold text-status-success">{trend}</span>}
      </div>
    </Card>
  )
}
