import type { Layer } from '@getrheo/contracts/layers';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import { walkScreenLayers } from '@getrheo/contracts/screens';

const randomHex = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** All layer ids across every screen (manifest-level uniqueness). */
export const collectManifestLayerIds = (manifest: FlowManifest): Set<string> => {
  const ids = new Set<string>();
  for (const s of manifest.screens) {
    walkScreenLayers(s, (l) => {
      ids.add(l.id);
    });
  }
  return ids;
};

/**
 * Rewrites the screen's id and every layer id so they cannot collide with an existing manifest.
 * Uses JSON substitution with longest-id-first ordering to avoid partial replacements.
 */
export const remapScreenIdsForManifestIngest = (
  manifest: FlowManifest,
  screen: Screen,
): Screen => {
  const screenIds = new Set(manifest.screens.map((s) => s.id));
  let newScreenId = `scr_ai_${randomHex(4)}`;
  let sn = 0;
  while (screenIds.has(newScreenId)) {
    newScreenId = `scr_ai_${randomHex(4)}_${sn++}`.slice(0, 64);
  }

  const usedLayers = collectManifestLayerIds(manifest);
  const token = randomHex(3);
  const map = new Map<string, string>();

  walkScreenLayers(screen, (l) => {
    if (map.has(l.id)) return;
    const tail = l.id.replace(/^lyr_/i, '').replace(/[^a-z0-9_]/gi, '_') || 'layer';
    let nid = `lyr_ai_${token}_${tail}`;
    let i = 0;
    for (;;) {
      const taken =
        usedLayers.has(nid) || [...map.values()].some((v) => v === nid);
      if (!taken) break;
      i += 1;
      nid = `lyr_ai_${token}_${tail}_${i}`.slice(0, 64);
    }
    map.set(l.id, nid);
    usedLayers.add(nid);
  });

  let json = JSON.stringify({ ...screen, id: newScreenId });
  const pairs = [...map.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [oldId, newId] of pairs) {
    json = json.split(oldId).join(newId);
  }
  return JSON.parse(json) as Screen;
};

/**
 * After in-place AI screen replace, ensure layer ids are unique across the manifest:
 * forbidden = ids used on other screens; duplicate ids within the replacement tree are remapped.
 */
export const remapReplacedScreenLayerCollisionsInManifest = (
  manifest: FlowManifest,
  targetScreenId: string,
  screen: Screen,
): Screen => {
  const forbidden = new Set<string>();
  for (const s of manifest.screens) {
    if (s.id === targetScreenId) continue;
    walkScreenLayers(s, (l) => forbidden.add(l.id));
  }

  const next = JSON.parse(JSON.stringify(screen)) as Screen;
  const seen = new Set<string>();
  const used = new Set(forbidden);

  const alloc = (): string => {
    let i = 0;
    for (;;) {
      const nid = `lyr_ai_${randomHex(4)}_${i++}`.slice(0, 64);
      if (!used.has(nid)) {
        used.add(nid);
        return nid;
      }
    }
  };

  const fix = (layer: Layer): void => {
    if (forbidden.has(layer.id) || seen.has(layer.id)) {
      layer.id = alloc();
    }
    seen.add(layer.id);

    if (layer.kind === 'stack') layer.children.forEach(fix);
    else if (layer.kind === 'carousel') layer.slides.forEach(fix);
    else if (layer.kind === 'button' || layer.kind === 'back_button') layer.children.forEach(fix);
    else if (layer.kind === 'hyperlink') layer.children.forEach(fix);
    else if (layer.kind === 'single_choice' || layer.kind === 'multiple_choice') {
      layer.children.forEach(fix);
    } else if (layer.kind === 'text_input' || layer.kind === 'scale_input') {
      layer.children?.forEach(fix);
    } else if (layer.kind === 'oauth_login') layer.children.forEach(fix);
    else if (layer.kind === 'oauth_provider' && layer.variant === 'custom') layer.children.forEach(fix);
    else if (layer.kind === 'email_password_auth') layer.children.forEach(fix);
    else if (layer.kind === 'email_password_field') layer.children?.forEach(fix);
    else if (layer.kind === 'email_password_submit') layer.children.forEach(fix);
  };

  if (next.regions.header) fix(next.regions.header);
  fix(next.regions.body);
  if (next.regions.footer) fix(next.regions.footer);
  return next;
};
