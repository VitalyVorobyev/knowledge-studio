import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  MarkerType,
  Position,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { colors, type Entity, type Views } from "./types";
export function Graph({
  entities,
  view,
  views,
  onSelect,
  onLayout,
  editable,
  relationFilter,
}: {
  entities: Entity[];
  view: string;
  views: Views;
  onSelect: (id: string) => void;
  onLayout: (id: string, pos: { x: number; y: number }) => void;
  editable: boolean;
  relationFilter: string;
}) {
  const initial = useMemo(() => {
    const kinds = [...new Set(entities.map((e) => e.kind))];
    const count: Record<string, number> = {};
    return entities.map((e, i) => {
      const depth = (id: string, visited = new Set<string>()): number => {
        if (visited.has(id)) return 0;
        visited.add(id);
        const item = entities.find((x) => x.id === id);
        const deps =
          item?.relations.filter(
            (r) =>
              r.type === "depends_on" &&
              entities.some((x) => x.id === r.target),
          ) ?? [];
        return deps.length
          ? 1 + Math.max(...deps.map((r) => depth(r.target, new Set(visited))))
          : 0;
      };
      const col =
        view === "Dependencies"
          ? depth(e.id)
          : kinds.length === 1
            ? i % 4
            : kinds.indexOf(e.kind);
      const group = view === "Dependencies" ? String(col) : e.kind;
      const row =
        kinds.length === 1 && view !== "Dependencies"
          ? Math.floor(i / 4)
          : (count[group] ?? 0);
      count[group] = row + 1;
      return {
        id: e.id,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: views.layouts[view]?.[e.id] ?? { x: col * 290, y: row * 122 },
        data: {
          label: (
            <>
              <span className="node-id">
                {e.id} · {e.kind}
              </span>
              <strong>{e.title}</strong>
              <span className="node-status">
                {e.status}
                {e.details.change_request ? " · CR-01" : ""}
              </span>
            </>
          ),
        },
        style: { borderTop: `3px solid ${colors[e.kind]}`, width: 235 },
        className: e.details.change_request ? "changed-node" : "",
      };
    });
  }, [entities, view, views.layouts]);
  const [nodes, setNodes] = useState<Node[]>(initial);
  useEffect(() => setNodes(initial), [initial]);
  const ids = new Set(entities.map((e) => e.id));
  const edges = entities.flatMap((e) =>
    e.relations
      .filter(
        (r) =>
          ids.has(r.target) && (!relationFilter || r.type === relationFilter),
      )
      .map((r) => ({
        id: `${e.id}-${r.type}-${r.target}`,
        source: e.id,
        target: r.target,
        label: r.type,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#a0afad" },
        labelStyle: { fontSize: 10, fill: "#5f706e" },
      })),
  );
  return (
    <div className="graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes: NodeChange[]) =>
          setNodes((n) => applyNodeChanges(changes, n))
        }
        onNodeClick={(_, node) => onSelect(node.id)}
        onEdgeClick={(_, edge) => onSelect(edge.source)}
        onNodeDragStop={(_, node) => onLayout(node.id, node.position)}
        nodesDraggable={editable}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={1.7}
      >
        <Background gap={22} color="#d6dfdc" />
        <MiniMap
          nodeColor={(n) =>
            colors[entities.find((e) => e.id === n.id)?.kind ?? ""] ?? "#87938e"
          }
          pannable
          zoomable
        />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="graph-caption">
        {entities.length} entities · {edges.length} relations · click a node or
        edge to inspect{editable ? " · drag to save layout" : ""}
      </div>
    </div>
  );
}
