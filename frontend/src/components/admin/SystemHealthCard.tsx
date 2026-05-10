"use client"

import * as React from "react"
import { Card } from "@/components/ui/Card"
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
    { name: "pgvector (Postgres)", key: "pgvector", icon: Search },
    { name: "Neo4j Graph", key: "neo4j", icon: Network },
    { name: "Redis Queue", key: "redis", icon: HardDrive },
    { name: "Ollama LLM", key: "ollama", icon: Cpu },
  ] as const

  return (
    <Card className="p-6 h-full flex flex-col">
      <h3 className="text-lg font-bold text-text-primary mb-4">System Health</h3>
      <div className="space-y-4 flex-1">
        {services.map((service) => {
          const status = health[service.key]
          const isHealthy = status === "healthy"
          return (
            <div key={service.key} className="flex items-center justify-between p-3 rounded-[8px] bg-surface-2 border border-border-subtle">
              <div className="flex items-center gap-3">
                <service.icon className="h-5 w-5 text-text-secondary" />
                <span className="text-sm font-medium text-text-primary">{service.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                  {status}
                </span>
                {isHealthy ? (
                  <CheckCircle2 className="h-4 w-4 text-status-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-status-error" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
