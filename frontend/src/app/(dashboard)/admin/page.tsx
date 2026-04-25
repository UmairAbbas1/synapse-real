"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { get } from "@/lib/api"
import { Card } from "@/components/ui/Card"
import { SystemHealthCard, SystemHealth } from "@/components/admin/SystemHealthCard"
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Users, FileText, Database, Activity, Clock } from "lucide-react"

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
  health: { postgres: "healthy", qdrant: "healthy", neo4j: "healthy", redis: "healthy", ollama: "healthy" }
}

export default function AdminDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => get<DashboardStats>('/admin/stats').catch(() => fallbackData),
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
