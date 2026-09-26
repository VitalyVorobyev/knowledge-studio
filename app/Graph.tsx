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
import { RotateCcw } from "lucide-react";
import { colors, type Entity, type Views } from "./types";
import {
  layoutPositions,
  shouldFocusRelations,
  visibleLinks,
} from "./graphLayout";

const relationColors: Record<string, string> = {
  depends_on: "#a65b39",
  blocks: "#b34f48",
  uses: "#336f7a",
  implements: "#416e91",
  validates: "#3d8467",
  derived_from: "#786993",
  supersedes: "#936d41",
  owned_by: "#697d8b",
  implemented_in: "#587992",
  motivated_by: "#847651",
};
const emptyPositions: Record<string, { x: number; y: number }> = {};

export function Graph({
  entities,
  view,
  views,
  onSelect,
  onLayout,
  onResetLayout,
  editable,
  relationFilter,
}: {
  entities: Entity[];
  view: string;
  views: Views;
  onSelect: (id: string) => void;
  onLayout: (id: string, pos: { x: number; y: number }) => void;
  onResetLayout: () => void;
  editable: boolean;
  relationFilter: string;
}) {
  const links = useMemo(
    () => visibleLinks(entities, relationFilter),
    [entities, relationFilter],
  );
  const linked = useMemo(
    () => new Set(links.flatMap((link) => [link.source, link.target])),
    [links],
  );
  const [focus, setFocus] = useState(() =>
    shouldFocusRelations(entities.length, links),
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const shown = useMemo(
    () => (focus ? entities.filter((e) => linked.has(e.id)) : entities),
    [entities, focus, linked],
  );
  const unlinked = focus ? entities.filter((e) => !linked.has(e.id)) : [];
  const saved = views.layouts[view] ?? emptyPositions;
  const positions = useMemo(
    () => layoutPositions(shown, links),
    [shown, links],
  );
  const initial = useMemo(
    () =>
      shown.map((e) => ({
        id: e.id,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: saved[e.id] ?? positions[e.id],
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
        style: { borderTop: `3px solid ${colors[e.kind]}`, width: 244 },
        className: e.details.change_request ? "changed-node" : "",
      })),
    [shown, saved, positions],
  );
  const [nodes, setNodes] = useState<Node[]>(initial);
  useEffect(() => setNodes(initial), [initial]);
  const highlighted = hovered
    ? new Set([
        hovered,
        ...links.flatMap((link) =>
          link.source === hovered
            ? [link.target]
            : link.target === hovered
              ? [link.source]
              : [],
        ),
      ])
    : null;
  const styledNodes = nodes.map((node) => ({
    ...node,
    className:
      `${node.className ?? ""} ${highlighted && !highlighted.has(node.id) ? "dimmed-node" : ""}`.trim(),
  }));
  const edges = links.map((link) => {
    const color = relationColors[link.type] ?? "#5d7772";
    const active =
      !hovered || hovered === link.source || hovered === link.target;
    return {
      id: `${link.source}-${link.type}-${link.target}`,
      source: link.source,
      target: link.target,
      type: "smoothstep",
      pathOptions: { borderRadius: 10, offset: 22 },
      label: link.type.replaceAll("_", " "),
      labelBgPadding: [7, 4] as [number, number],
      labelBgBorderRadius: 3,
      labelBgStyle: {
        fill: "#fffefa",
        fillOpacity: 0.96,
        stroke: "#d9e3dc",
        strokeWidth: 1,
      },
      labelStyle: { fontSize: 11, fontWeight: 600, fill: color },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 17, height: 17 },
      style: {
        stroke: color,
        strokeWidth: active ? 2.5 : 1.4,
        opacity: active ? 1 : 0.2,
      },
    };
  });
  const savedCount = Object.keys(saved).length;
  const kinds = [...new Set(links.map((link) => link.type))];

  return (
    <div className="graph-area">
      <div className="graph-toolbar">
        {(linked.size < entities.length || focus) && (
          <div className="graph-scope" aria-label="Graph scope">
            <button
              className={focus ? "active" : ""}
              onClick={() => setFocus(true)}
              disabled={!links.length}
            >
              Connected <span>{linked.size}</span>
            </button>
            <button
              className={!focus ? "active" : ""}
              onClick={() => setFocus(false)}
            >
              All entities <span>{entities.length}</span>
            </button>
          </div>
        )}
        <div className="graph-relations">
          {kinds.map((type) => (
            <span key={type}>
              <i style={{ background: relationColors[type] ?? "#5d7772" }} />
              {type.replaceAll("_", " ")} ·{" "}
              {links.filter((link) => link.type === type).length}
            </span>
          ))}
          {!links.length && (
            <span>No relationships match this view and filter</span>
          )}
        </div>
        {savedCount > 0 && (
          <button
            className="graph-reset"
            disabled={!editable}
            onClick={onResetLayout}
            title="Remove saved positions for this map and arrange nodes automatically"
          >
            <RotateCcw size={13} /> Reset layout <small>{savedCount}</small>
          </button>
        )}
      </div>
      <div className={`graph ${focus ? "graph-focused" : ""}`}>
        {shown.length ? (
          <ReactFlow
            key={`${view}-${focus}-${relationFilter}`}
            nodes={styledNodes}
            edges={edges}
            onNodesChange={(changes: NodeChange[]) =>
              setNodes((current) => applyNodeChanges(changes, current))
            }
            onNodeClick={(_, node) => onSelect(node.id)}
            onNodeMouseEnter={(_, node) => setHovered(node.id)}
            onNodeMouseLeave={() => setHovered(null)}
            onEdgeClick={(_, edge) => onSelect(edge.source)}
            onNodeDragStop={(_, node) => onLayout(node.id, node.position)}
            nodesDraggable={editable}
            nodesConnectable={false}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1.15 }}
            minZoom={0.2}
            maxZoom={1.7}
          >
            <Background gap={22} color="#d6dfdc" />
            {!focus && (
              <MiniMap
                nodeColor={(node) =>
                  colors[entities.find((e) => e.id === node.id)?.kind ?? ""] ??
                  "#87938e"
                }
                pannable
                zoomable
              />
            )}
            <Controls showInteractive={false} />
          </ReactFlow>
        ) : (
          <div className="graph-empty">
            <strong>No visible relationships</strong>
            <p>Choose another relation type or show all entities.</p>
          </div>
        )}
        <div className="graph-caption">
          {shown.length} shown · {edges.length} explicit relations · click to
          inspect
          {editable ? " · drag to save position" : ""}
        </div>
      </div>
      {focus && unlinked.length > 0 && (
        <div className="graph-unlinked">
          <div>
            <strong>Outside this relationship map</strong>
            <p>
              {unlinked.length} entities have no visible link of the selected
              type. They remain part of the project model.
            </p>
          </div>
          <div className="graph-unlinked-list">
            {unlinked.map((entity) => (
              <button
                key={entity.id}
                onClick={() => onSelect(entity.id)}
                title={entity.title}
              >
                <i style={{ background: colors[entity.kind] }} />{" "}
                <code>{entity.id}</code> {entity.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
