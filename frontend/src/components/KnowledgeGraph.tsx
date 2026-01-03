import { useState, useCallback, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Search } from "lucide-react";

// Types for knowledge graph
export interface GraphNode {
  id: string;
  label: string;
  type: "document" | "topic" | "entity" | "concept";
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface KnowledgeGraphProps {
  data: KnowledgeGraphData;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  width?: number;
  height?: number;
}

// Simple force-directed graph layout
function useForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): { nodes: GraphNode[]; isSimulating: boolean } {
  const [layoutNodes, setLayoutNodes] = useState<GraphNode[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (nodes.length === 0) {
      setLayoutNodes([]);
      return;
    }

    // Initialize positions randomly
    const initialNodes = nodes.map((node) => ({
      ...node,
      x: node.x ?? Math.random() * width,
      y: node.y ?? Math.random() * height,
    }));

    setLayoutNodes(initialNodes);
    setIsSimulating(true);

    // Simple force simulation
    let iteration = 0;
    const maxIterations = 100;

    const simulate = (): void => {
      if (iteration >= maxIterations) {
        setIsSimulating(false);
        return;
      }

      setLayoutNodes((prev) => {
        const newNodes = [...prev];
        const k = Math.sqrt((width * height) / nodes.length);

        // Repulsion between nodes
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = (newNodes[j].x ?? 0) - (newNodes[i].x ?? 0);
            const dy = (newNodes[j].y ?? 0) - (newNodes[i].y ?? 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (k * k) / dist;

            const fx = (dx / dist) * force * 0.1;
            const fy = (dy / dist) * force * 0.1;

            newNodes[i] = {
              ...newNodes[i],
              x: (newNodes[i].x ?? 0) - fx,
              y: (newNodes[i].y ?? 0) - fy,
            };
            newNodes[j] = {
              ...newNodes[j],
              x: (newNodes[j].x ?? 0) + fx,
              y: (newNodes[j].y ?? 0) + fy,
            };
          }
        }

        // Attraction along edges
        for (const edge of edges) {
          const sourceIdx = newNodes.findIndex((n) => n.id === edge.source);
          const targetIdx = newNodes.findIndex((n) => n.id === edge.target);
          if (sourceIdx === -1 || targetIdx === -1) continue;

          const source = newNodes[sourceIdx];
          const target = newNodes[targetIdx];
          const dx = (target.x ?? 0) - (source.x ?? 0);
          const dy = (target.y ?? 0) - (source.y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist * dist) / k;

          const fx = (dx / dist) * force * 0.01;
          const fy = (dy / dist) * force * 0.01;

          newNodes[sourceIdx] = {
            ...source,
            x: (source.x ?? 0) + fx,
            y: (source.y ?? 0) + fy,
          };
          newNodes[targetIdx] = {
            ...target,
            x: (target.x ?? 0) - fx,
            y: (target.y ?? 0) - fy,
          };
        }

        // Keep nodes in bounds
        return newNodes.map((node) => ({
          ...node,
          x: Math.max(50, Math.min(width - 50, node.x ?? 0)),
          y: Math.max(50, Math.min(height - 50, node.y ?? 0)),
        }));
      });

      iteration++;
      frameRef.current = requestAnimationFrame(simulate);
    };

    frameRef.current = requestAnimationFrame(simulate);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [nodes, edges, width, height]);

  return { nodes: layoutNodes, isSimulating };
}

export default function KnowledgeGraph({
  data,
  onNodeClick,
  onEdgeClick,
  width = 800,
  height = 600,
}: KnowledgeGraphProps): React.ReactElement {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, isSimulating } = useForceLayout(
    data.nodes,
    data.edges,
    width,
    height,
  );

  const getNodeColor = (type: GraphNode["type"]): string => {
    switch (type) {
      case "document":
        return "#8b5cf6";
      case "topic":
        return "#0ea5e9";
      case "entity":
        return "#22c55e";
      case "concept":
        return "#f97316";
      default:
        return "#64748b";
    }
  };

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node.id);
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  const handleZoomIn = (): void => setZoom((z) => Math.min(z * 1.2, 3));
  const handleZoomOut = (): void => setZoom((z) => Math.max(z / 1.2, 0.3));
  const handleReset = (): void => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Filter nodes by search
  const filteredNodes = searchQuery
    ? nodes.filter((n) =>
        n.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : nodes;

  const highlightedIds = new Set(filteredNodes.map((n) => n.id));

  return (
    <div className="relative bg-card border border-border rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-48 pl-7 pr-2 py-1 bg-background/80 backdrop-blur border border-border rounded text-xs"
          />
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background/80 backdrop-blur rounded-lg border border-border p-1">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-muted rounded"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-muted rounded"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-muted rounded"
          title="Reset view"
        >
          <Maximize2 size={14} />
        </button>
        {isSimulating && (
          <RefreshCw size={14} className="animate-spin text-nexus-500 ml-1" />
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-background/80 backdrop-blur rounded-lg border border-border px-3 py-2">
        {["document", "topic", "entity", "concept"].map((type) => (
          <div key={type} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: getNodeColor(type as GraphNode["type"]),
              }}
            />
            <span className="text-xs capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Graph SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-move"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: "center",
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>

        {/* Edges */}
        <g>
          {data.edges.map((edge) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            const isHighlighted =
              highlightedIds.has(edge.source) &&
              highlightedIds.has(edge.target);

            return (
              <g key={edge.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isHighlighted ? "#8b5cf6" : "#374151"}
                  strokeWidth={edge.weight || 1}
                  strokeOpacity={isHighlighted ? 0.8 : 0.3}
                  markerEnd="url(#arrowhead)"
                  onClick={() => onEdgeClick?.(edge)}
                  className="cursor-pointer hover:stroke-nexus-500"
                />
                {edge.label && (
                  <text
                    x={((source.x ?? 0) + (target.x ?? 0)) / 2}
                    y={((source.y ?? 0) + (target.y ?? 0)) / 2}
                    fill="#9ca3af"
                    fontSize={10}
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const isHighlighted = highlightedIds.has(node.id);
            const isSelected = selectedNode === node.id;
            const radius = node.size || 20;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer"
                opacity={isHighlighted || !searchQuery ? 1 : 0.2}
              >
                <circle
                  r={radius}
                  fill={node.color || getNodeColor(node.type)}
                  stroke={isSelected ? "#fff" : "transparent"}
                  strokeWidth={2}
                  className="hover:opacity-80 transition-opacity"
                />
                <text
                  y={radius + 12}
                  fill="#e5e7eb"
                  fontSize={10}
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {node.label.length > 15
                    ? node.label.slice(0, 15) + "..."
                    : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Node details panel */}
      {selectedNode && (
        <div className="absolute bottom-3 right-3 w-64 bg-background/90 backdrop-blur border border-border rounded-lg p-3 z-10">
          {(() => {
            const node = nodes.find((n) => n.id === selectedNode);
            if (!node) return null;
            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{node.label}</span>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Type: {node.type}</div>
                  <div>
                    Connections:{" "}
                    {
                      data.edges.filter(
                        (e) => e.source === node.id || e.target === node.id,
                      ).length
                    }
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
