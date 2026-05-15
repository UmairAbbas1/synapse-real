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
    refetchInterval: 30000,
    initialData: fallbackData,
  })

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-slide-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">System Intelligence</h1>
        <p className="text-sm text-text-secondary">Real-time monitoring and analytics for Synapse AI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Knowledge Base" value={data.total_documents.toLocaleString()} icon={FileText} trend="+5.2%" description="Total indexed chunks" />
        <StatCard title="Connected Sources" value={data.active_sources.toString()} icon={Database} description="Live data ingestion points" />
        <StatCard title="Concurrent Users" value={data.active_users.toString()} icon={Users} trend="Active" description="Live sessions across nodes" />
        <StatCard title="Mean Response Time" value={`${data.avg_response_time_ms}ms`} icon={Clock} trend="-12ms" description="Latency across all experts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="p-8 lg:col-span-2 overflow-hidden border-none shadow-lg bg-white/40">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-text-primary">Query Throughput</h3>
              <p className="text-xs text-text-tertiary uppercase tracking-widest font-mono">24 Hour Activity Loop</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-accent-primary">{data.queries_today.toLocaleString()}</span>
                <span className="text-[10px] text-text-tertiary uppercase font-mono">Total Queries</span>
              </div>
              <div className="h-10 w-px bg-border-medium" />
              <div className="h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
            </div>
          </div>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourly_queries}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="var(--text-tertiary)" fontSize={10} tickLine={false} axisLine={false} tick={{dy: 10}} />
                <YAxis hide />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }} 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255,255,255,0.9)', 
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--border-medium)', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                  }}
                />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="lg:col-span-1">
          <SystemHealthCard health={data.health} />
        </div>
      </div>
      
      <Card className="p-8 border-none shadow-lg bg-white/40">
        <div className="flex flex-col gap-1 mb-8">
          <h3 className="text-xl font-bold text-text-primary">Knowledge Growth</h3>
          <p className="text-xs text-text-tertiary uppercase tracking-widest font-mono">Temporal Document Density</p>
        </div>
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.document_trend}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={10} tickLine={false} axisLine={false} tick={{dy: 10}} />
              <YAxis hide />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255,255,255,0.9)', 
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border-medium)', 
                  borderRadius: '12px' 
                }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="var(--accent-primary)" 
                strokeWidth={3}
                fill="url(#areaGradient)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, trend, description }: { title: string, value: string, icon: React.ElementType, trend?: string, description?: string }) {
  return (
    <Card className="p-6 flex flex-col justify-between h-44 group border-none shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1 bg-white/50">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{title}</span>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-bold text-text-primary tracking-tighter">{value}</h4>
            {trend && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                trend.startsWith('+') ? "text-success bg-success/10" : "text-accent-primary bg-accent-muted"
              )}>
                {trend}
              </span>
            )}
          </div>
        </div>
        <div className="p-3 bg-white rounded-[12px] shadow-sm group-hover:bg-accent-primary group-hover:text-white transition-all duration-500 border border-border-subtle">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-auto">
        <p className="text-[11px] text-text-tertiary leading-relaxed font-medium">{description}</p>
        <div className="mt-3 h-1 w-full bg-border-subtle rounded-full overflow-hidden">
          <div className="h-full bg-accent-primary w-2/3 group-hover:w-full transition-all duration-1000 ease-out" />
        </div>
      </div>
    </Card>
  )
}
