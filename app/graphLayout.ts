import type { Entity } from "./types";

export type GraphLink = { source: string; target: string; type: string };

export function visibleLinks(
  entities: Entity[],
  relationFilter: string,
): GraphLink[] {
  const ids = new Set(entities.map((e) => e.id));
  return entities.flatMap((e) =>
    e.relations
      .filter(
        (r) =>
          ids.has(r.target) && (!relationFilter || r.type === relationFilter),
      )
      .map((r) => ({ source: e.id, target: r.target, type: r.type })),
  );
}

export function shouldFocusRelations(
  entityCount: number,
  links: GraphLink[],
): boolean {
  const linked = new Set(links.flatMap((link) => [link.source, link.target]));
  return entityCount >= 8 && linked.size > 0 && linked.size < entityCount * 0.6;
}

export function layoutPositions(
  entities: Entity[],
  links: GraphLink[],
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  if (entities.length <= 6 && links.length) {
    const linked = new Set(links.flatMap((link) => [link.source, link.target]));
    const flow = new Map<string, number>();
    for (const link of links) {
      flow.set(link.source, (flow.get(link.source) ?? 0) + 1);
      flow.set(link.target, (flow.get(link.target) ?? 0) - 1);
    }
    const ordered = [...entities].sort(
      (a, b) =>
        Number(!linked.has(a.id)) - Number(!linked.has(b.id)) ||
        (flow.get(b.id) ?? 0) - (flow.get(a.id) ?? 0) ||
        a.id.localeCompare(b.id),
    );
    ordered.forEach((entity, index) => {
      positions[entity.id] = {
        x: (index % 3) * 330,
        y: Math.floor(index / 3) * 170,
      };
    });
    return positions;
  }

  const kinds = [...new Set(entities.map((e) => e.kind))];
  let y = 0;
  for (const kind of kinds) {
    const group = entities.filter((e) => e.kind === kind);
    const columns = Math.min(
      4,
      Math.max(1, Math.ceil(Math.sqrt(group.length * 1.4))),
    );
    const xOffset = (4 - columns) * 145;
    group.forEach((entity, index) => {
      positions[entity.id] = {
        x: xOffset + (index % columns) * 290,
        y: y + Math.floor(index / columns) * 132,
      };
    });
    y += Math.ceil(group.length / columns) * 132 + 92;
  }
  return positions;
}
