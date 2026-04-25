"use client"

import * as React from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import * as THREE from "three"
import { useQuery } from "@tanstack/react-query"
import { get } from "@/lib/api"

interface GraphNode {
  id: string
  label: "Person" | "Document" | "Project" | "Team"
  name: string
  degree: number
}

interface GraphEdge {
  source: string
  target: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const mockGraphData: GraphData = {
  nodes: [
    { id: "1", label: "Person", name: "Alice", degree: 5 },
    { id: "2", label: "Document", name: "Q1 Architecture", degree: 3 },
    { id: "3", label: "Project", name: "Project Synapse", degree: 8 },
    { id: "4", label: "Team", name: "Engineering", degree: 4 },
  ],
  edges: [
    { source: "1", target: "4" },
    { source: "1", target: "2" },
    { source: "3", target: "4" },
    { source: "2", target: "3" },
  ]
}

const COLORS = {
  Person: "#00E5CC", // Cyan
  Document: "#E2E8F0", // White/light
  Project: "#FBBF24", // Amber
  Team: "#34D399", // Green
}

function GraphScene({ data }: { data: GraphData }) {
  const [hoveredNode, setHoveredNode] = React.useState<GraphNode | null>(null)
  
  // Very simplified radial force simulation layout for MVP
  const nodePositions = React.useMemo(() => {
    const pos = new Map<string, THREE.Vector3>()
    data.nodes.forEach((node, i) => {
      const radius = 10 + Math.random() * 15
      const angle = (i / data.nodes.length) * Math.PI * 2
      pos.set(node.id, new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 10,
        Math.sin(angle) * radius
      ))
    })
    return pos
  }, [data.nodes])

  // Build edge geometry
  const lineGeometry = React.useMemo(() => {
    const points: THREE.Vector3[] = []
    data.edges.forEach(edge => {
      const sourcePos = nodePositions.get(edge.source)
      const targetPos = nodePositions.get(edge.target)
      if (sourcePos && targetPos) {
        points.push(sourcePos, targetPos)
      }
    })
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    return geometry
  }, [data.edges, nodePositions])

  return (
    <group>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      {/* Edges */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#333344" transparent opacity={0.4} />
      </lineSegments>

      {/* Nodes */}
      {data.nodes.map(node => {
        const pos = nodePositions.get(node.id)!
        const size = Math.max(0.5, Math.min(node.degree * 0.2, 3))
        
        return (
          <mesh 
            key={node.id} 
            position={pos}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredNode(node) }}
            onPointerOut={() => setHoveredNode(null)}
          >
            <sphereGeometry args={[size, 32, 32]} />
            <meshStandardMaterial 
              color={COLORS[node.label]} 
              emissive={COLORS[node.label]}
              emissiveIntensity={0.2}
            />
            {hoveredNode?.id === node.id && (
              <Html distanceFactor={25} center>
                <div className="bg-surface-1 border border-border-strong px-3 py-2 rounded-[8px] shadow-lg pointer-events-none whitespace-nowrap">
                  <p className="text-sm font-bold text-text-primary">{node.name}</p>
                  <p className="text-xs text-text-secondary">{node.label} · Degree {node.degree}</p>
                </div>
              </Html>
            )}
          </mesh>
        )
      })}
    </group>
  )
}

export function KnowledgeGraph3D() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminGraph'],
    queryFn: () => get<GraphData>('/admin/graph').catch(() => mockGraphData),
    initialData: mockGraphData,
  })

  return (
    <div className="w-full h-full relative bg-bg-primary rounded-[12px] overflow-hidden border border-border-subtle">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-bg-primary/50 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        </div>
      )}
      
      <Canvas camera={{ position: [0, 20, 35], fov: 60 }}>
        <color attach="background" args={["#0A0A0F"]} />
        <GraphScene data={data} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={5} 
          maxDistance={100} 
        />
      </Canvas>

      <div className="absolute bottom-6 left-6 bg-surface-1/80 backdrop-blur-md p-4 rounded-[8px] border border-border-strong">
        <h4 className="text-xs font-bold text-text-primary mb-2 uppercase tracking-wider">Legend</h4>
        <div className="space-y-2">
          {Object.entries(COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ color, backgroundColor: color }} />
              <span className="text-xs text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
