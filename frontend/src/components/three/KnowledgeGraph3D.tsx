"use client"

import * as React from "react"
import { Canvas } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import * as THREE from "three"
import { cn } from "@/lib/utils"

export interface GraphNode {
  id: string
  label: "Person" | "Document" | "Project" | "Team"
  name: string
  degree: number
}

export interface GraphEdge {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

type GraphLabel = GraphNode["label"]

interface LayoutPoint {
  x: number
  z: number
  vx: number
  vz: number
}

const COLORS = {
  Person: "#00E5CC",
  Document: "#B7C0CC",
  Project: "#F2C94C",
  Team: "#2BD97B",
}

const LABEL_ORDER: GraphLabel[] = ["Person", "Document", "Project", "Team"]

const LEGEND_SWATCH: Record<keyof typeof COLORS, string> = {
  Person: "bg-accent-primary",
  Document: "bg-text-primary",
  Project: "bg-status-warning",
  Team: "bg-status-success",
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

const mulberry32 = (seed: number) => {
  return () => {
    let t = seed + 0x6d2b79f5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pointsToGeometry = (points: THREE.Vector3[]) => {
  if (points.length === 0) return null
  return new THREE.BufferGeometry().setFromPoints(points)
}

const normalizeEdges = (nodes: GraphNode[], edges: GraphEdge[]) => {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const seen = new Set<string>()
  const normalized: GraphEdge[] = []

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    if (edge.source === edge.target) continue
    const a = edge.source < edge.target ? edge.source : edge.target
    const b = edge.source < edge.target ? edge.target : edge.source
    const key = `${a}|${b}`
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push({ source: a, target: b })
  }

  return normalized
}

const buildAdjacency = (nodes: GraphNode[], edges: GraphEdge[]) => {
  const adjacency = new Map<string, Set<string>>()
  for (const node of nodes) {
    adjacency.set(node.id, new Set<string>())
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  }
  return adjacency
}

const buildNodePositions = (nodes: GraphNode[], edges: GraphEdge[]) => {
  const positions = new Map<string, THREE.Vector3>()
  if (nodes.length === 0) return positions

  const points = new Map<string, LayoutPoint>()
  const sortedNodes = [...nodes].sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name))
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const adjacency = buildAdjacency(nodes, edges)

  sortedNodes.forEach((node, index) => {
    const rng = mulberry32(hashString(node.id))
    const angle = index * goldenAngle + (rng() - 0.5) * 0.22
    const radius = 8 + Math.sqrt(index + 1) * 3.6
    points.set(node.id, {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      vx: 0,
      vz: 0,
    })
  })

  const repulsion = 135
  const spring = 0.018
  const centerPull = 0.004
  const damping = 0.86
  const targetLengthBase = 9
  const iterations = 90

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let i = 0; i < sortedNodes.length; i += 1) {
      const nodeA = sortedNodes[i]
      const pointA = points.get(nodeA.id)
      if (!pointA) continue

      for (let j = i + 1; j < sortedNodes.length; j += 1) {
        const nodeB = sortedNodes[j]
        const pointB = points.get(nodeB.id)
        if (!pointB) continue

        let dx = pointA.x - pointB.x
        let dz = pointA.z - pointB.z
        const distanceSq = dx * dx + dz * dz + 0.05
        const distance = Math.sqrt(distanceSq)
        if (distance < 0.0001) {
          dx = 0.01
          dz = 0.01
        }

        const force = repulsion / distanceSq
        const fx = (dx / distance) * force
        const fz = (dz / distance) * force
        pointA.vx += fx
        pointA.vz += fz
        pointB.vx -= fx
        pointB.vz -= fz
      }
    }

    for (const edge of edges) {
      const sourcePoint = points.get(edge.source)
      const targetPoint = points.get(edge.target)
      if (!sourcePoint || !targetPoint) continue

      const dx = targetPoint.x - sourcePoint.x
      const dz = targetPoint.z - sourcePoint.z
      const distance = Math.sqrt(dx * dx + dz * dz) + 0.001
      const degreeMix =
        ((adjacency.get(edge.source)?.size ?? 1) + (adjacency.get(edge.target)?.size ?? 1)) / 2
      const targetLength = targetLengthBase + Math.min(degreeMix, 10) * 0.5
      const stretch = distance - targetLength
      const force = spring * stretch
      const fx = (dx / distance) * force
      const fz = (dz / distance) * force

      sourcePoint.vx += fx
      sourcePoint.vz += fz
      targetPoint.vx -= fx
      targetPoint.vz -= fz
    }

    for (const point of points.values()) {
      point.vx -= point.x * centerPull
      point.vz -= point.z * centerPull

      point.vx *= damping
      point.vz *= damping

      point.x += clamp(point.vx, -1.6, 1.6)
      point.z += clamp(point.vz, -1.6, 1.6)
    }
  }

  let centroidX = 0
  let centroidZ = 0
  let maxRadius = 0

  for (const node of sortedNodes) {
    const point = points.get(node.id)
    if (!point) continue
    centroidX += point.x
    centroidZ += point.z
  }

  centroidX /= sortedNodes.length
  centroidZ /= sortedNodes.length

  for (const node of sortedNodes) {
    const point = points.get(node.id)
    if (!point) continue
    const dx = point.x - centroidX
    const dz = point.z - centroidZ
    const radius = Math.sqrt(dx * dx + dz * dz)
    if (radius > maxRadius) maxRadius = radius
  }

  const scale = maxRadius > 36 ? 36 / maxRadius : 1

  for (const node of sortedNodes) {
    const point = points.get(node.id)
    if (!point) continue

    const rng = mulberry32(hashString(node.id))
    const labelIndex = LABEL_ORDER.indexOf(node.label)
    const layerOffset = (labelIndex - (LABEL_ORDER.length - 1) / 2) * 1.8
    const y = layerOffset + (rng() - 0.5) * 1.2

    positions.set(
      node.id,
      new THREE.Vector3((point.x - centroidX) * scale, y, (point.z - centroidZ) * scale)
    )
  }

  return positions
}

function GraphScene({
  nodes,
  edges,
  nodePositions,
  highlightedIds,
  activeNodeIds,
  selectedNodeId,
  onSelectNode,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodePositions: Map<string, THREE.Vector3>
  highlightedIds: Set<string>
  activeNodeIds: Set<string>
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
}) {
  const [hoveredNode, setHoveredNode] = React.useState<GraphNode | null>(null)

  const edgeGeometry = React.useMemo(() => {
    const defaultPoints: THREE.Vector3[] = []
    const activePoints: THREE.Vector3[] = []

    for (const edge of edges) {
      const sourcePos = nodePositions.get(edge.source)
      const targetPos = nodePositions.get(edge.target)
      if (!sourcePos || !targetPos) continue

      const isActive = selectedNodeId
        ? edge.source === selectedNodeId || edge.target === selectedNodeId
        : activeNodeIds.size > 0 &&
          (activeNodeIds.has(edge.source) || activeNodeIds.has(edge.target))

      if (isActive) {
        activePoints.push(sourcePos, targetPos)
      } else {
        defaultPoints.push(sourcePos, targetPos)
      }
    }

    return {
      defaultGeometry: pointsToGeometry(defaultPoints),
      activeGeometry: pointsToGeometry(activePoints),
    }
  }, [activeNodeIds, edges, nodePositions, selectedNodeId])

  const hasActiveLayer = selectedNodeId !== null || activeNodeIds.size > 0

  return (
    <group>
      <ambientLight intensity={0.42} />
      <pointLight position={[16, 18, 14]} intensity={0.82} />
      <directionalLight position={[-12, 14, -8]} intensity={0.3} />
      <gridHelper args={[120, 22, "#0F1E2D", "#0C1420"]} position={[0, -8, 0]} />

      {edgeGeometry.defaultGeometry ? (
        <lineSegments geometry={edgeGeometry.defaultGeometry}>
          <lineBasicMaterial color="#2A3D55" transparent opacity={hasActiveLayer ? 0.14 : 0.38} />
        </lineSegments>
      ) : null}

      {edgeGeometry.activeGeometry ? (
        <lineSegments geometry={edgeGeometry.activeGeometry}>
          <lineBasicMaterial color="#00E5CC" transparent opacity={0.76} />
        </lineSegments>
      ) : null}

      {nodes.map((node) => {
        const pos = nodePositions.get(node.id)
        if (!pos) return null

        const isSelected = selectedNodeId === node.id
        const isHighlighted = highlightedIds.has(node.id)
        const isActive = activeNodeIds.size === 0 || activeNodeIds.has(node.id)
        const dimmed = !isActive

        const baseSize = Math.max(0.52, Math.min(1 + node.degree * 0.07, 2.4))
        const size = baseSize * (isSelected ? 1.28 : isHighlighted ? 1.15 : 1)

        return (
          <group key={node.id} position={pos}>
            {isSelected ? (
              <mesh>
                <sphereGeometry args={[size * 1.32, 20, 20]} />
                <meshBasicMaterial color="#00E5CC" transparent opacity={0.2} wireframe />
              </mesh>
            ) : null}

            <mesh
              onClick={(event) => {
                event.stopPropagation()
                onSelectNode(node.id)
              }}
              onPointerOver={(event) => {
                event.stopPropagation()
                setHoveredNode(node)
              }}
              onPointerOut={() => setHoveredNode(null)}
            >
              <sphereGeometry args={[size, 28, 28]} />
              <meshStandardMaterial
                color={COLORS[node.label]}
                emissive={COLORS[node.label]}
                emissiveIntensity={isSelected ? 0.42 : isHighlighted ? 0.3 : 0.14}
                metalness={0.12}
                roughness={0.58}
                transparent={dimmed}
                opacity={dimmed ? 0.22 : 0.96}
              />

              {hoveredNode?.id === node.id ? (
                <Html distanceFactor={24} center>
                  <div className="rounded-[8px] border border-[#1B2533] bg-[#0A0A0F]/92 px-3 py-2 pointer-events-none whitespace-nowrap">
                    <p className="text-sm font-semibold text-white/90">{node.name}</p>
                    <p className="text-xs text-white/60">
                      {node.label} | Degree {node.degree}
                    </p>
                  </div>
                </Html>
              ) : null}
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function KnowledgeGraph3D({
  data,
  searchQuery,
  isLoading,
}: {
  data: GraphData
  searchQuery?: string
  isLoading?: boolean
}) {
  const controlsRef = React.useRef<OrbitControlsImpl | null>(null)
  const [webglSupported, setWebglSupported] = React.useState<boolean | null>(null)
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)

  const normalizedEdges = React.useMemo(
    () => normalizeEdges(data.nodes, data.edges),
    [data.edges, data.nodes]
  )
  const adjacency = React.useMemo(
    () => buildAdjacency(data.nodes, normalizedEdges),
    [data.nodes, normalizedEdges]
  )
  const nodeById = React.useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const node of data.nodes) {
      map.set(node.id, node)
    }
    return map
  }, [data.nodes])

  const needle = (searchQuery ?? "").trim().toLowerCase()
  const highlightedIds = React.useMemo(() => {
    if (!needle) return new Set<string>()
    return new Set(
      data.nodes
        .filter((node) => node.name.toLowerCase().includes(needle))
        .map((node) => node.id)
    )
  }, [data.nodes, needle])

  const nodePositions = React.useMemo(
    () => buildNodePositions(data.nodes, normalizedEdges),
    [data.nodes, normalizedEdges]
  )
  const hasData = data.nodes.length > 0

  React.useEffect(() => {
    if (!selectedNodeId) return
    if (!nodeById.has(selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }, [nodeById, selectedNodeId])

  const activeNodeIds = React.useMemo(() => {
    if (selectedNodeId) {
      const result = new Set<string>([selectedNodeId])
      for (const neighbor of adjacency.get(selectedNodeId) ?? []) {
        result.add(neighbor)
      }
      return result
    }
    if (highlightedIds.size > 0) return highlightedIds
    return new Set<string>()
  }, [adjacency, highlightedIds, selectedNodeId])

  const selectedNode = React.useMemo(
    () => (selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null),
    [nodeById, selectedNodeId]
  )

  const selectedNeighbors = React.useMemo(() => {
    if (!selectedNodeId) return []
    const neighbors = adjacency.get(selectedNodeId)
    if (!neighbors) return []
    const result: GraphNode[] = []
    for (const id of neighbors) {
      const node = nodeById.get(id)
      if (node) result.push(node)
    }
    return result.sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name))
  }, [adjacency, nodeById, selectedNodeId])

  const selectedNeighborBreakdown = React.useMemo(() => {
    const counts: Record<GraphLabel, number> = {
      Person: 0,
      Document: 0,
      Project: 0,
      Team: 0,
    }
    for (const neighbor of selectedNeighbors) {
      counts[neighbor.label] += 1
    }
    return counts
  }, [selectedNeighbors])

  const activeEdgeCount = React.useMemo(() => {
    if (!selectedNodeId) return 0
    let count = 0
    for (const edge of normalizedEdges) {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        count += 1
      }
    }
    return count
  }, [normalizedEdges, selectedNodeId])

  const fitGraphView = React.useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return

    const points = Array.from(nodePositions.values())
    if (points.length === 0) return

    const box = new THREE.Box3().setFromPoints(points)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const radius = Math.max(size.length() * 0.48, 14)

    const camera = controls.object as THREE.PerspectiveCamera
    const fovRadians = THREE.MathUtils.degToRad(camera.fov)
    const distance = (radius / Math.tan(fovRadians / 2)) * 1.06
    const direction = new THREE.Vector3(1, 0.58, 1).normalize()
    const cameraPosition = center.clone().add(direction.multiplyScalar(distance))

    camera.position.copy(cameraPosition)
    camera.near = 0.1
    camera.far = Math.max(600, distance * 8)
    camera.updateProjectionMatrix()

    controls.target.copy(center)
    controls.update()
  }, [nodePositions])

  React.useEffect(() => {
    fitGraphView()
  }, [fitGraphView])

  React.useEffect(() => {
    const canvas = document.createElement("canvas")
    try {
      const gl =
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl") ??
        canvas.getContext("webgl2")
      setWebglSupported(gl !== null)
    } catch {
      setWebglSupported(false)
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[12px] border border-border-subtle bg-bg-primary">
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/50 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        </div>
      ) : null}

      {webglSupported === false ? (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div className="max-w-md rounded-[12px] border border-border-strong bg-surface-1 p-6">
            <h3 className="text-lg font-bold text-text-primary">WebGL unavailable</h3>
            <p className="mt-2 text-sm text-text-secondary">
              This browser or graphics driver could not create a WebGL context, so the 3D graph cannot be rendered here.
            </p>
            <p className="mt-3 text-xs text-text-tertiary">
              Try a different browser, enable hardware acceleration, or update the GPU driver.
            </p>
          </div>
        </div>
      ) : webglSupported === true && hasData ? (
        <Canvas
          camera={{ position: [0, 20, 45], fov: 52 }}
          dpr={[1, 1.8]}
          onPointerMissed={() => setSelectedNodeId(null)}
        >
          <color attach="background" args={["#0A0A0F"]} />
          <GraphScene
            nodes={data.nodes}
            edges={normalizedEdges}
            nodePositions={nodePositions}
            highlightedIds={highlightedIds}
            activeNodeIds={activeNodeIds}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={8}
            maxDistance={140}
            maxPolarAngle={Math.PI * 0.48}
          />
        </Canvas>
      ) : webglSupported === true ? (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div className="max-w-md rounded-[12px] border border-border-strong bg-surface-1 p-6">
            <h3 className="text-lg font-bold text-text-primary">No graph data yet</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Ingest sources or run a sync to populate the knowledge graph.
            </p>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-6 left-6 rounded-[8px] border border-[#1B2533] bg-[#0A0A0F]/84 p-4 backdrop-blur-md">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/82">Legend</h4>
        <div className="space-y-2">
          {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((label) => (
            <div key={label} className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full", LEGEND_SWATCH[label])} />
              <span className="text-xs text-white/65">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedNode ? (
        <div className="absolute right-5 top-5 w-[290px] rounded-[10px] border border-[#1B2533] bg-[#0A0A0F]/88 p-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/50">Selected Node</p>
              <h4 className="mt-1 text-sm font-semibold text-white/90">{selectedNode.name}</h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              className="rounded-[6px] border border-[#1B2533] px-2 py-1 text-[10px] uppercase tracking-wider text-white/65 transition-colors hover:border-[#00E5CC] hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-[8px] border border-[#1B2533] p-2">
              <p className="text-white/50">Type</p>
              <p className="mt-1 text-white/90">{selectedNode.label}</p>
            </div>
            <div className="rounded-[8px] border border-[#1B2533] p-2">
              <p className="text-white/50">Degree</p>
              <p className="mt-1 text-white/90">{selectedNode.degree}</p>
            </div>
            <div className="rounded-[8px] border border-[#1B2533] p-2">
              <p className="text-white/50">Neighbors</p>
              <p className="mt-1 text-white/90">{selectedNeighbors.length}</p>
            </div>
            <div className="rounded-[8px] border border-[#1B2533] p-2">
              <p className="text-white/50">Links</p>
              <p className="mt-1 text-white/90">{activeEdgeCount}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-[6px] border border-[#1B2533] px-2 py-1 text-[10px] text-white/60">
              P {selectedNeighborBreakdown.Person}
            </span>
            <span className="rounded-[6px] border border-[#1B2533] px-2 py-1 text-[10px] text-white/60">
              D {selectedNeighborBreakdown.Document}
            </span>
            <span className="rounded-[6px] border border-[#1B2533] px-2 py-1 text-[10px] text-white/60">
              Pr {selectedNeighborBreakdown.Project}
            </span>
            <span className="rounded-[6px] border border-[#1B2533] px-2 py-1 text-[10px] text-white/60">
              T {selectedNeighborBreakdown.Team}
            </span>
          </div>
        </div>
      ) : null}

      {webglSupported === true && hasData ? (
        <div className="absolute bottom-6 right-6 flex items-center gap-2">
          <div className="rounded-[8px] border border-[#1B2533] bg-[#0A0A0F]/84 px-3 py-2 text-[11px] text-white/64">
            Drag to rotate | Scroll to zoom | Click node to inspect
          </div>
          <button
            type="button"
            onClick={fitGraphView}
            className="rounded-[6px] border border-[#1B2533] bg-[#0A0A0F]/84 px-3 py-2 text-[11px] text-white/72 transition-colors hover:border-[#00E5CC] hover:text-white"
          >
            Fit graph
          </button>
        </div>
      ) : null}
    </div>
  )
}
