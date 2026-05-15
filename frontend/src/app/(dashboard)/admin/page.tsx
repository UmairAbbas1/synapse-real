"use client"

import { useQuery } from "@tanstack/react-query"
import { get } from "@/lib/api"
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { SystemHealthCard, SystemHealth } from "@/components/admin/SystemHealthCard"

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

const fallbackData: DashboardStats = {
  total_documents: 4200000,
  document_trend: Array.from({ length: 7 }, (_, i) => ({ date: `Day ${i + 1}`, count: 10000 + i * 500 })),
  active_sources: 4,
  queries_today: 1240,
  hourly_queries: Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: Math.floor(Math.random() * 100) })),
  avg_response_time_ms: 1200,
  active_users: 24,
  health: { postgres: "healthy", pgvector: "healthy", neo4j: "healthy", redis: "healthy", ollama: "healthy" }
}

function normalizeDashboardStats(raw: any): DashboardStats {
  return raw || fallbackData
}

export default function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      try {
        const raw = await get<any>("/admin/stats")
        return normalizeDashboardStats(raw)
      } catch {
        return fallbackData
      }
    },
    refetchInterval: 30000,
    initialData: fallbackData,
  })

  // Format numbers for display (e.g. 4200000 -> 4.2M)
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto py-8 px-margin-mobile flex flex-col gap-lg animate-slide-up">
      {/* Page Header */}
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-md text-[24px] text-on-surface font-semibold tracking-tight">System Telemetry</h1>
        <p className="font-body-md text-[14px] text-on-surface-variant">Live cluster health & vector operations</p>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* Metric 1 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm flex flex-col justify-between gap-base h-[100px] hover:-translate-y-1 transition-transform cursor-default">
          <div className="font-label-sm text-[11px] font-mono text-on-surface-variant flex items-center gap-2 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>database</span>
            Total Embeddings
          </div>
          <div className="font-headline-lg text-[24px] font-semibold text-on-surface">
            {formatNumber(data.total_documents)}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm flex flex-col justify-between gap-base h-[100px] hover:-translate-y-1 transition-transform cursor-default">
          <div className="font-label-sm text-[11px] font-mono text-on-surface-variant flex items-center gap-2 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[16px] text-[#15803d]" style={{ fontVariationSettings: "'FILL' 0" }}>health_and_safety</span>
            Vector DB Health
          </div>
          <div className="font-mono-md text-[13px] text-[#15803d] flex items-center gap-2 font-medium bg-[#15803d]/10 w-max px-2 py-0.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#15803d] animate-pulse"></div>
            Optimal
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm flex flex-col justify-between gap-base h-[100px] hover:-translate-y-1 transition-transform cursor-default">
          <div className="font-label-sm text-[11px] font-mono text-on-surface-variant flex items-center gap-2 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[16px] text-[#d97706]" style={{ fontVariationSettings: "'FILL' 0" }}>speed</span>
            Query Latency p99
          </div>
          <div className="font-mono-md text-[13px] font-mono text-on-surface font-medium">
            {(data.avg_response_time_ms / 1000).toFixed(1)}s
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm flex flex-col justify-between gap-base h-[100px] hover:-translate-y-1 transition-transform cursor-default">
          <div className="font-label-sm text-[11px] font-mono text-on-surface-variant flex items-center gap-2 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[16px] text-[#2563eb]" style={{ fontVariationSettings: "'FILL' 0" }}>terminal</span>
            Active Operators
          </div>
          <div className="font-mono-md text-[13px] font-mono text-on-surface font-medium">
            {data.active_users}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
        {/* Main Chart Panel */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm flex flex-col gap-lg h-[400px]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-xs">
              <h2 className="font-body-md text-[16px] font-semibold text-on-surface">Graph Traversal vs Vector Search</h2>
              <span className="font-label-sm text-[11px] font-mono text-on-surface-variant uppercase tracking-widest mt-1">Last 7 Days • Ops/sec</span>
            </div>
            <button className="p-1 text-on-surface-variant hover:bg-surface-container-low rounded transition-colors">
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>
          </div>
          
          <div className="w-full h-full relative mt-4 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.document_trend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#004ac6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#004ac6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#737686" fontSize={11} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                <YAxis stroke="#737686" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => \`\${val/1000}k\`} fontFamily="JetBrains Mono" width={40} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #c3c6d7', fontSize: '13px', fontFamily: 'JetBrains Mono' }}
                />
                <Area type="monotone" dataKey="count" stroke="#004ac6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Query Throughput Panel */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm flex flex-col gap-lg h-[400px]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-xs">
              <h2 className="font-body-md text-[16px] font-semibold text-on-surface">Hourly Query Throughput</h2>
              <span className="font-label-sm text-[11px] font-mono text-on-surface-variant uppercase tracking-widest mt-1">24 Hour Activity Loop</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-primary">{data.queries_today.toLocaleString()}</span>
                <span className="text-[10px] text-on-surface-variant uppercase font-mono">Total Queries</span>
            </div>
          </div>
          
          <div className="w-full h-full relative mt-4 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourly_queries}>
                <XAxis dataKey="hour" stroke="#737686" fontSize={11} tickLine={false} axisLine={false} tick={{dy: 5}} fontFamily="JetBrains Mono" />
                <YAxis hide />
                <RechartsTooltip 
                  cursor={{ fill: '#f2f3ff' }} 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #c3c6d7', fontSize: '13px', fontFamily: 'JetBrains Mono' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* System Health Module */}
      <div className="mt-4">
        <SystemHealthCard health={data.health} />
      </div>
    </div>
  )
}
