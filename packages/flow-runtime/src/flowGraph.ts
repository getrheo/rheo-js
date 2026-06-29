import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import type { LocalizedText } from '@getrheo/contracts/localized';
import { OS_PERMISSION_OUTCOME_CONTINUE, OS_PERMISSION_OUTCOME_END } from '@getrheo/contracts/layers';
import { collectDecisionFieldKeysFromNode } from '@getrheo/contracts/decisions';
import { collectFieldKeys, findInputLayer, walkScreen } from './layers';
import { findScreen } from './stateMachine';
import { analyzeLiquidTemplateInner, extractLiquidTemplateBodies } from './interpolateTemplate';

const localizedStrings = (t: LocalizedText): string[] => {
  const out: string[] = [t.default];
  if (t.translations) {
    for (const loc of Object.keys(t.translations)) {
      if (/^[a-z]{2}(-[A-Z]{2})?$/.test(loc)) {
        const v = t.translations[loc];
        if (v) out.push(v);
      }
    }
  }
  return out;
};

const collectOutgoingTargets = (screen: Screen): string[] => {
  const out: string[] = [];
  if (screen.next.default) out.push(screen.next.default);
  walkScreen(screen, (l) => {
    if (l.kind === 'single_choice' || l.kind === 'multiple_choice') {
      if (l.branching.enabled) {
        for (const c of l.branching.conditions) out.push(c.goTo);
      }
    }
    if (l.kind === 'button' && l.action.kind === 'go_to_step') out.push(l.action.screenId);
    if (l.kind === 'button' && l.action.kind === 'request_os_permission') {
      const o = l.action.outcomes;
      for (const t of [o.granted, o.denied, o.blocked]) {
        if (t === OS_PERMISSION_OUTCOME_END) {
          // Terminal branch — no outgoing edge.
        } else if (t === OS_PERMISSION_OUTCOME_CONTINUE) {
          if (screen.next.default) out.push(screen.next.default);
        } else {
          out.push(t);
        }
      }
    }
    if (l.kind === 'button' && l.action.kind === 'go_back_one_screen' && l.action.fallbackScreenId) {
      out.push(l.action.fallbackScreenId);
    }
    if (l.kind === 'back_button' && l.fallbackScreenId) out.push(l.fallbackScreenId);
  });
  return out;
};

const buildForwardAdjacency = (manifest: FlowManifest): Map<string, string[]> => {
  const m = new Map<string, string[]>();
  for (const s of manifest.screens) {
    m.set(s.id, collectOutgoingTargets(s as Screen));
  }
  for (const d of manifest.decisionNodes ?? []) {
    const outs = [
      ...d.cases.map((c) => c.next).filter((x): x is string => x != null),
      d.elseNext,
    ].filter((x): x is string => x != null);
    m.set(d.id, outs);
  }
  return m;
};

const reverseAdjacency = (forward: Map<string, string[]>): Map<string, string[]> => {
  const rev = new Map<string, string[]>();
  for (const [u, vs] of forward) {
    for (const v of vs) {
      const arr = rev.get(v) ?? [];
      arr.push(u);
      rev.set(v, arr);
    }
  }
  return rev;
};

const bfsForward = (entry: string | null, forward: Map<string, string[]>): Set<string> => {
  if (entry == null) return new Set();
  const seen = new Set<string>([entry]);
  const q = [entry];
  while (q.length) {
    const u = q.shift()!;
    for (const v of forward.get(u) ?? []) {
      if (!seen.has(v)) {
        seen.add(v);
        q.push(v);
      }
    }
  }
  return seen;
};

/** All screens `t` (including `targetId`) such that some path `t → … → targetId` exists, restricted to `allowed` nodes. */
const reverseReachable = (
  targetId: string,
  rev: Map<string, string[]>,
  allowed: Set<string>,
): Set<string> => {
  const seen = new Set<string>([targetId]);
  const q = [targetId];
  while (q.length) {
    const u = q.shift()!;
    for (const v of rev.get(u) ?? []) {
      if (!allowed.has(v)) continue;
      if (!seen.has(v)) {
        seen.add(v);
        q.push(v);
      }
    }
  }
  return seen;
};

/**
 * Screens that may have already been completed before `screenId` is shown
 * (strict predecessors on some path from entry), intersected with reachability from entry.
 */
export const upstreamScreenIdsForPicker = (manifest: FlowManifest, screenId: string): string[] => {
  const forward = buildForwardAdjacency(manifest);
  const rev = reverseAdjacency(forward);
  const entry = manifest.entryScreenId;
  if (entry == null) return [];
  const reachFromEntry = bfsForward(entry, forward);
  const ancestors = reverseReachable(screenId, rev, reachFromEntry);
  const screenSet = new Set(manifest.screens.map((s) => s.id));
  return [...ancestors].filter((id) => id !== screenId && screenSet.has(id));
};

/** Dominator sets for nodes reachable from entry (each set includes the node itself). */
export const computeDominators = (manifest: FlowManifest): Map<string, Set<string>> => {
  const forward = buildForwardAdjacency(manifest);
  const entry = manifest.entryScreenId;
  if (entry == null) return new Map();
  const reachable = bfsForward(entry, forward);
  const nodes = [...reachable];

  const pred = new Map<string, string[]>();
  for (const [u, vs] of forward) {
    for (const v of vs) {
      if (!reachable.has(v)) continue;
      const arr = pred.get(v) ?? [];
      arr.push(u);
      pred.set(v, arr);
    }
  }

  const all = new Set(nodes);
  const dom = new Map<string, Set<string>>();
  for (const n of nodes) {
    if (n === entry) dom.set(n, new Set([entry]));
    else dom.set(n, new Set(all));
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes) {
      if (n === entry) continue;
      const ps = (pred.get(n) ?? []).filter((p) => reachable.has(p));
      let nextDom: Set<string>;
      if (ps.length === 0) {
        nextDom = new Set([n]);
      } else {
        nextDom = new Set([n]);
        const first = dom.get(ps[0]!) ?? new Set(all);
        let inter = new Set(first);
        for (let i = 1; i < ps.length; i++) {
          const d = dom.get(ps[i]!) ?? new Set(all);
          inter = new Set([...inter].filter((x) => d.has(x)));
        }
        for (const x of inter) nextDom.add(x);
      }
      const cur = dom.get(n)!;
      if (cur.size !== nextDom.size || [...nextDom].some((x) => !cur.has(x))) {
        dom.set(n, nextDom);
        changed = true;
      }
    }
  }
  return dom;
};

const fieldKeyOwnerScreenId = (manifest: FlowManifest, fieldKey: string): string | null => {
  for (const e of collectFieldKeys(manifest)) {
    if (e.fieldKey === fieldKey) return e.screenId;
  }
  return null;
};

const scanLocalizedForWarnings = (
  manifest: FlowManifest,
  hostScreenId: string,
  text: LocalizedText,
  layerId: string,
  dom: Map<string, Set<string>>,
  seen: Set<string>,
  out: string[],
): void => {
  const screenLabel =
    manifest.screens.find((s) => s.id === hostScreenId)?.name ?? hostScreenId;

  for (const str of localizedStrings(text)) {
    for (const inner of extractLiquidTemplateBodies(str)) {
      const { expr } = analyzeLiquidTemplateInner(inner);
      if (expr.kind === 'invalid') {
        const key = `invalid:${hostScreenId}:${layerId}:${inner}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(
          `Warning: Screen "${screenLabel}" text layer "${layerId}" has an invalid template token "{{${inner}}}".`,
        );
        continue;
      }
      if (expr.kind === 'custom') {
        const key = `custom:${hostScreenId}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(
            `Warning: Screen "${screenLabel}" uses \`custom.*\` template variables — values are supplied by the host SDK at runtime.`,
          );
        }
        continue;
      }

      const ownerId = fieldKeyOwnerScreenId(manifest, expr.fieldKey);
      if (!ownerId) {
        const key = `unknown:${hostScreenId}:${layerId}:${expr.fieldKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(
          `Warning: Screen "${screenLabel}" references unknown variable "{{${expr.fieldKey}}}" (no matching input fieldKey).`,
        );
        continue;
      }

      if (expr.mode === 'id') {
        const ownerScreen = findScreen(manifest, ownerId);
        const input = ownerScreen ? findInputLayer(ownerScreen) : null;
        if (input?.kind !== 'single_choice' && input?.kind !== 'multiple_choice') {
          const key = `id:${hostScreenId}:${layerId}:${expr.fieldKey}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(
            `Warning: Screen "${screenLabel}" uses "{{${expr.fieldKey}.id}}" but "${expr.fieldKey}" is not a choice input — \`.id\` only applies to single or multiple choice.`,
          );
        }
      }

      if (ownerId === hostScreenId) {
        const key = `same:${hostScreenId}:${layerId}:${expr.fieldKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(
          `Warning: Screen "${screenLabel}" references "{{${expr.fieldKey}}}" which is collected on the same screen — it will be empty until after the user submits.`,
        );
        continue;
      }

      const dset = dom.get(hostScreenId);
      if (dset && !dset.has(ownerId)) {
        const key = `path:${hostScreenId}:${layerId}:${expr.fieldKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(
          `Warning: Screen "${screenLabel}" references "{{${expr.fieldKey}}}" which may be empty on some paths (not collected before this screen on every route).`,
        );
      }
    }
  }
};

/**
 * Non-blocking warnings for Text layer `{{ … }}` usage (dominance, same-screen, invalid tokens).
 */
export const collectInterpolationWarnings = (manifest: FlowManifest): string[] => {
  const dom = computeDominators(manifest);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const screen of manifest.screens as Screen[]) {
    walkScreen(screen, (l) => {
      if (l.kind !== 'text') return;
      scanLocalizedForWarnings(manifest, screen.id, l.text, l.id, dom, seen, out);
    });
  }

  return out;
};

/** Dominance warnings for `fieldKey` references inside decision expressions. */
export const collectDecisionWarnings = (manifest: FlowManifest): string[] => {
  const dom = computeDominators(manifest);
  const out: string[] = [];
  for (const dn of manifest.decisionNodes ?? []) {
    const label = dn.name ?? dn.id;
    const dset = dom.get(dn.id);
    for (const fk of collectDecisionFieldKeysFromNode(dn)) {
      const ownerId = fieldKeyOwnerScreenId(manifest, fk);
      if (!ownerId) {
        out.push(`Warning: Decision "${label}" references unknown fieldKey "${fk}".`);
        continue;
      }
      if (dset && !dset.has(ownerId)) {
        out.push(
          `Warning: Decision "${label}" references "${fk}" which may be empty on some paths (not collected before this decision on every route).`,
        );
      }
    }
  }
  return out;
};

/** `fieldKey` values available in the variable picker for `screenId`. */
export const upstreamFieldKeysForPicker = (manifest: FlowManifest, screenId: string): string[] => {
  const upstream = new Set(upstreamScreenIdsForPicker(manifest, screenId));
  const keys = collectFieldKeys(manifest)
    .filter((e) => upstream.has(e.screenId))
    .map((e) => e.fieldKey);
  return [...new Set(keys)].sort();
};
