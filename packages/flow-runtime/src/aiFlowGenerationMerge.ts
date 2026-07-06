import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';

/** Blank seed from {@link buildBlankManifest}: single empty screen awaiting AI replacement. */
export const AI_FLOW_PLACEHOLDER_SCREEN_ID = 'scr_blank';

const bodyStackChildrenLen = (screen: Screen): number => {
  const body = screen.regions.body;
  if (body.kind !== 'stack') return -1;
  return body.children.length;
};

const screenById = (manifest: FlowManifest): Map<string, Screen> =>
  new Map(manifest.screens.map((screen) => [screen.id, screen]));

export const isAiFlowPlaceholderManifest = (manifest: FlowManifest): boolean =>
  manifest.screens.length === 1 &&
  manifest.screens[0]?.id === AI_FLOW_PLACEHOLDER_SCREEN_ID &&
  bodyStackChildrenLen(manifest.screens[0]) === 0;

const findEmptyPlaceholderScreen = (manifest: FlowManifest): Screen | undefined =>
  manifest.screens.find(
    (screen) =>
      screen.id === AI_FLOW_PLACEHOLDER_SCREEN_ID && bodyStackChildrenLen(screen) === 0,
  );

/** Entry screen for default-path traversal; repairs stale entryScreenId when possible. */
export const resolveDefaultPathEntryScreenId = (manifest: FlowManifest): string | undefined => {
  const map = screenById(manifest);
  if (manifest.entryScreenId && map.has(manifest.entryScreenId)) {
    return manifest.entryScreenId;
  }
  return manifest.screens[0]?.id;
};

const pruneEmptyPlaceholderScreen = (manifest: FlowManifest): FlowManifest | undefined => {
  const placeholder = findEmptyPlaceholderScreen(manifest);
  if (!placeholder || manifest.screens.length <= 1) return undefined;

  const screens = manifest.screens.filter((screen) => screen.id !== AI_FLOW_PLACEHOLDER_SCREEN_ID);
  if (screens.length === manifest.screens.length) return undefined;

  let entryScreenId = manifest.entryScreenId;
  if (
    entryScreenId === AI_FLOW_PLACEHOLDER_SCREEN_ID ||
    (entryScreenId != null && !screens.some((screen) => screen.id === entryScreenId))
  ) {
    entryScreenId = screens[0]?.id ?? null;
  }

  return {
    ...manifest,
    screens,
    entryScreenId,
  };
};

/** Last screen on the default-next chain starting at entry (linear v1 assumption for AI expansion). */
export const findDefaultPathTailScreen = (manifest: FlowManifest): Screen | undefined => {
  const map = screenById(manifest);
  const startId = resolveDefaultPathEntryScreenId(manifest);
  let cur = startId ? map.get(startId) : undefined;
  const seen = new Set<string>();
  let last: Screen | undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    last = cur;
    const nextId = cur.next.default;
    if (!nextId) break;
    cur = map.get(nextId);
  }
  return last;
};

export const ensureLayoutNodes = (manifest: FlowManifest): FlowManifest => {
  const existing = new Map(
    (manifest.builderMeta?.layout?.nodes ?? []).map((n) => [n.id, n] as const),
  );
  const nodes = manifest.screens.map((s, idx) => {
    const hit = existing.get(s.id);
    if (hit) return { ...hit };
    return { id: s.id, x: 80 + idx * 360, y: 120 };
  });
  return {
    ...manifest,
    builderMeta: {
      ...(manifest.builderMeta ?? {}),
      layout: {
        ...(manifest.builderMeta?.layout ?? {}),
        nodes,
      },
    },
  };
};

/**
 * Insert a model-generated screen into a draft manifest.
 * — Replaces the blank placeholder as the first screen when still on the initial seed.
 * — Otherwise appends after the default-path tail and wires `next`.
 */
export const mergeAiGeneratedScreenIntoManifest = (
  manifest: FlowManifest,
  screen: Screen,
): FlowManifest => {
  if (manifest.screens.length === 0) {
    const merged: FlowManifest = {
      ...manifest,
      screens: [{ ...screen, next: { default: null } }],
      entryScreenId: screen.id,
    };
    return ensureLayoutNodes(merged);
  }

  const pruned = pruneEmptyPlaceholderScreen(manifest);
  if (pruned) {
    return mergeAiGeneratedScreenIntoManifest(pruned, screen);
  }

  if (isAiFlowPlaceholderManifest(manifest)) {
    const screens: Screen[] = [{ ...screen, next: { default: null } }];
    let builderMeta = manifest.builderMeta;
    const oldEntry = manifest.entryScreenId;
    if (builderMeta?.layout?.nodes?.length) {
      builderMeta = {
        ...builderMeta,
        layout: {
          ...builderMeta.layout,
          nodes: builderMeta.layout.nodes.map((n) =>
            n.id === oldEntry ? { ...n, id: screen.id } : { ...n },
          ),
        },
      };
    }
    const merged: FlowManifest = {
      ...manifest,
      screens,
      entryScreenId: screen.id,
      builderMeta,
    };
    return ensureLayoutNodes(merged);
  }

  const tail = findDefaultPathTailScreen(manifest);
  if (!tail) {
    const repairedEntryId = manifest.screens[0]?.id;
    if (!repairedEntryId) {
      throw new Error('mergeAiGeneratedScreenIntoManifest: no tail on default path');
    }
    return mergeAiGeneratedScreenIntoManifest(
      { ...manifest, entryScreenId: repairedEntryId },
      screen,
    );
  }
  if (tail.next.default !== null) {
    const tailNextExists = screenById(manifest).has(tail.next.default);
    if (tailNextExists) {
      throw new Error('mergeAiGeneratedScreenIntoManifest: tail must end the default path (next is null)');
    }
  }

  const screens: Screen[] = manifest.screens.map((s) =>
    s.id === tail.id ? { ...s, next: { default: screen.id } } : s,
  );
  screens.push({ ...screen, next: { default: null } });
  const resolvedEntry = resolveDefaultPathEntryScreenId({ ...manifest, screens });
  const merged: FlowManifest = {
    ...manifest,
    screens,
    ...(resolvedEntry ? { entryScreenId: resolvedEntry } : {}),
  };
  return ensureLayoutNodes(merged);
};

/**
 * Appends a model-generated screen without changing any existing screen's `next` links.
 * The new screen always ends with `next: { default: null }` (canvas: user wires edges manually).
 */
export const appendGeneratedScreenToManifest = (manifest: FlowManifest, newScreen: Screen): FlowManifest => {
  const wiredNew: Screen = {
    ...newScreen,
    next: { default: null },
  };
  const merged: FlowManifest = {
    ...manifest,
    screens: [...manifest.screens, wiredNew],
  };
  return ensureLayoutNodes(merged);
};

/**
 * Inserts `newScreen` immediately after `anchorScreenId` on the default-next chain:
 * anchor → newScreen → (previous successor of anchor, if any).
 */
export const insertScreenAfterAnchorInManifest = (
  manifest: FlowManifest,
  anchorScreenId: string,
  newScreen: Screen,
): FlowManifest => {
  const anchor = manifest.screens.find((s) => s.id === anchorScreenId);
  if (!anchor) {
    throw new Error('insertScreenAfterAnchorInManifest: anchor screen not found');
  }

  const forwarded = anchor.next.default;
  const wiredNew: Screen = {
    ...newScreen,
    next: { default: forwarded ?? null },
  };

  const screens: Screen[] = manifest.screens.map((s) =>
    s.id === anchorScreenId ? { ...s, next: { default: wiredNew.id } } : s,
  );
  screens.push(wiredNew);
  const merged: FlowManifest = { ...manifest, screens };
  return ensureLayoutNodes(merged);
};

/**
 * Applies a slim model manifest onto the authoritative draft while preserving
 * `builderMeta` (canvas layout) and ensuring layout nodes exist for new screens.
 */
export const mergeSlimManifestPreservingBuilderMeta = (
  draft: FlowManifest,
  slim: FlowManifest,
): FlowManifest => {
  const merged: FlowManifest = {
    ...slim,
    builderMeta: draft.builderMeta,
  };
  return ensureLayoutNodes(merged);
};
