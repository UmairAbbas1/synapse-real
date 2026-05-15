"use client"

import * as React from "react"
import { Database, Search, Network, HardDrive, Cpu, CheckCircle2, XCircle } from "lucide-react"

export type ServiceStatus = "healthy" | "degraded" | "down"

export interface SystemHealth {
  postgres: ServiceStatus
  pgvector: ServiceStatus
  neo4j: ServiceStatus
  redis: ServiceStatus
  ollama: ServiceStatus
}

export function SystemHealthCard({ health }: { health: SystemHealth }) {
  const services = [
    { name: "PostgreSQL", key: "postgres", icon: Database },
    { name: "pgvector", key: "pgvector", icon: Search },
    { name: "Neo4j Graph", key: "neo4j", icon: Network },
    { name: "Redis Queue", key: "redis", icon: HardDrive },
    { name: "Ollama LLM", key: "ollama", icon: Cpu },
  ] as const

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm h-full flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h3 className="font-body-md text-[16px] font-semibold text-on-surface">System Health</h3>
        <span className="font-label-sm text-[11px] font-mono text-on-surface-variant uppercase tracking-widest mt-1">Infrastructure Status</span>
      </div>
      <div className="space-y-3 flex-1 mt-2">
        {services.map((service) => {
          const status = health[service.key]
          const isHealthy = status === "healthy"
          return (
            <div key={service.key} className="flex items-center justify-between py-2 border-b border-outline-variant/30 last:border-0">
              <div className="flex items-center gap-3">
                <service.icon className="h-4 w-4 text-on-surface-variant" />
                <span className="font-body-md text-[14px] text-on-surface">{service.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-mono-md text-[12px] font-medium px-2 py-0.5 rounded-full ${isHealthy ? 'bg-[#15803d]/10 text-[#15803d]' : 'bg-[#dc2626]/10 text-[#dc2626]'}`}>
                  {status}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
