export const DOCK_SECTIONS = ["presets", "surface", "paint", "sensors", "session"] as const;

export type DockSectionId = (typeof DOCK_SECTIONS)[number];

const SECTION_SET = new Set<string>(DOCK_SECTIONS);

export function isDockSectionId(id: unknown): id is DockSectionId {
  return typeof id === "string" && SECTION_SET.has(id);
}

/** Next/previous feature. null at the ends — the buttons disable instead of wrapping. */
export function nextDockSection(current: DockSectionId | null, dir: -1 | 1): DockSectionId | null {
  const from = current && isDockSectionId(current) ? DOCK_SECTIONS.indexOf(current) : 0;
  const i = from + dir;
  if (i < 0 || i >= DOCK_SECTIONS.length) return null;
  return DOCK_SECTIONS[i]!;
}

/** Which feature owns this scroll offset. `offsets` are section tops relative to the scroller. */
export function sectionAtOffset(offsets: number[], scrollTop: number, pad = 24): DockSectionId {
  let idx = 0;
  for (let i = 0; i < offsets.length && i < DOCK_SECTIONS.length; i++) {
    if (offsets[i]! <= scrollTop + pad) idx = i;
  }
  return DOCK_SECTIONS[Math.min(idx, DOCK_SECTIONS.length - 1)]!;
}

export function readVisibleDockSection(root: HTMLElement): DockSectionId {
  const offsets: number[] = [];
  const top = root.scrollTop;
  for (const id of DOCK_SECTIONS) {
    const node = root.querySelector(`[data-dock-section="${id}"]`);
    if (!(node instanceof HTMLElement)) {
      offsets.push(offsets.length === 0 ? 0 : offsets[offsets.length - 1]!);
      continue;
    }
    offsets.push(node.offsetTop);
  }
  return sectionAtOffset(offsets, top);
}
