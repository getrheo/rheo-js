import {
  type AnimatableProperty,
  type AnimationClip,
  type EasingToken,
  type Keyframe,
  type KeyframeTrack,
} from '@getrheo/contracts/animations';
import type { Layer, LayerKind, StackLayer } from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';
import { walkScreen } from './layers';

/**
 * Cubic-bezier control points for every named easing token. The exact
 * numbers are shared between web (CSS keyframes / `cubic-bezier(...)`)
 * and native (Reanimated `Easing.bezier`) so playback matches sample by
 * sample.
 */
export const EASING_BEZIERS: Record<EasingToken, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  // Material-style "standard" / "emphasized" curves — useful defaults
  // for product animations without inviting per-platform divergence.
  standard: [0.2, 0, 0, 1],
  emphasized: [0.3, 0, 0, 1],
};

const sampleBezier = (
  t: number,
  [x1, y1, x2, y2]: [number, number, number, number],
): number => {
  // Robust numeric solver for the parametric cubic-bezier curve. We need
  // to find the parameter `s` such that `bezierX(s) === t`, then return
  // `bezierY(s)`. Newton-Raphson with a fallback bisection keeps us
  // accurate at the curve endpoints (where derivatives near zero make
  // pure Newton flaky).
  if (x1 === y1 && x2 === y2) return t;
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const xAt = (s: number) => ((ax * s + bx) * s + cx) * s;
  const yAt = (s: number) => ((ay * s + by) * s + cy) * s;
  const dxAt = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  let s = t;
  for (let i = 0; i < 8; i++) {
    const x = xAt(s) - t;
    const dx = dxAt(s);
    if (Math.abs(x) < 1e-6) return yAt(s);
    if (Math.abs(dx) < 1e-6) break;
    s -= x / dx;
  }
  let lo = 0;
  let hi = 1;
  s = t;
  for (let i = 0; i < 24; i++) {
    const x = xAt(s);
    if (Math.abs(x - t) < 1e-6) return yAt(s);
    if (x < t) lo = s;
    else hi = s;
    s = (lo + hi) / 2;
  }
  return yAt(s);
};

/**
 * Map an authoring time `tNorm ∈ [0,1]` to the eased value for a single
 * track. Returns the final value when t ≥ last keyframe and the first
 * value when t ≤ first keyframe so renderers can hold pre/post values
 * without special-casing edges.
 */
export const sampleTrack = (track: KeyframeTrack, tNorm: number): number => {
  const ks = track.keyframes;
  if (tNorm <= ks[0]!.t) return ks[0]!.value;
  if (tNorm >= ks[ks.length - 1]!.t) return ks[ks.length - 1]!.value;
  let prev: Keyframe = ks[0]!;
  let next: Keyframe = ks[ks.length - 1]!;
  for (let i = 0; i < ks.length - 1; i++) {
    if (ks[i]!.t <= tNorm && ks[i + 1]!.t >= tNorm) {
      prev = ks[i]!;
      next = ks[i + 1]!;
      break;
    }
  }
  const span = next.t - prev.t;
  const localT = span === 0 ? 0 : (tNorm - prev.t) / span;
  const eased = sampleBezier(localT, EASING_BEZIERS[prev.easing ?? 'linear']);
  return prev.value + (next.value - prev.value) * eased;
};

export type SampledClip = Partial<Record<AnimatableProperty, number>>;

/** Effective delay for a clip given its owning screen's stagger config. */
export const effectiveDelayMs = (clip: AnimationClip, screen: Screen): number => {
  const base = clip.delayMs ?? 0;
  if (clip.trigger === 'stagger' && clip.staggerIndex !== undefined) {
    const step = screen.stagger?.stepMs ?? 60;
    return base + clip.staggerIndex * step;
  }
  return base;
};

/**
 * Sample every track of a clip at an absolute time `tMs` measured from
 * the clip's mount. Honors `delayMs` (incl. stagger). Always returns the
 * authored property keys, even if the clip has not yet started, so
 * renderers can treat the result as a stable style overlay.
 */
export const sampleClipAt = (
  clip: AnimationClip,
  screen: Screen,
  tMs: number,
): SampledClip => {
  const delay = effectiveDelayMs(clip, screen);
  const local = clip.durationMs > 0 ? (tMs - delay) / clip.durationMs : 1;
  const tNorm = Math.min(1, Math.max(0, local));
  const out: SampledClip = {};
  for (const track of clip.tracks) {
    out[track.property] = sampleTrack(track, tNorm);
  }
  return out;
};

/** Merge sampled clips: later keys override; only defined keys from `overlay` win. */
export const mergeSampledClips = (base: SampledClip, overlay: SampledClip): SampledClip => {
  const out: SampledClip = { ...base };
  for (const k of Object.keys(overlay) as (keyof SampledClip)[]) {
    const v = overlay[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
};

/**
 * Sample all clips for `layerId` at global screen time `tMs`.
 *
 * Clips are applied in order of increasing start time (`effectiveDelayMs`),
 * then stable `id`. Each clip contributes once its start time has been
 * reached; after it ends, its **final** sampled values stay merged into
 * state so later clips override animating properties. For **mount** and
 * **stagger** clips, while `tMs` is before that clip's delay, we merge its
 * **start** keyframe values unless some **earlier** clip is inside its own
 * `[delay, delay + duration)` window — so a delayed fade-in stays at opacity
 * 0 during the wait, but a move that overlaps the fade's delay still shows
 * default opacity until the fade segment begins. **Unmount** clips never
 * apply pre-delay sampling. This supports multiple appear / hide segments on
 * the same layer (web sim / builder scrub).
 *
 * **Native:** `LayerMotionShell` still uses the first mount + first unmount
 * clip only until RN playback is extended for arbitrary sequences.
 */
export const sampleLayerAnimAt = (screen: Screen, layerId: string, tMs: number): SampledClip => {
  const list = clipsByLayerId(screen).get(layerId) ?? [];
  if (list.length === 0) return {};

  const sorted = [...list].sort((a, b) => {
    const da = effectiveDelayMs(a, screen);
    const db = effectiveDelayMs(b, screen);
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });

  let state: SampledClip = {};
  for (let i = 0; i < sorted.length; i++) {
    const clip = sorted[i]!;
    const d = effectiveDelayMs(clip, screen);
    const end = d + clip.durationMs;
    if (tMs < d) {
      if (clip.trigger === 'unmount') continue;
      if (clip.trigger !== 'mount' && clip.trigger !== 'stagger') continue;
      const earlierAnimating = sorted.slice(0, i).some((earlier) => {
        const dE = effectiveDelayMs(earlier, screen);
        const endE = dE + earlier.durationMs;
        return tMs >= dE && tMs < endE;
      });
      if (earlierAnimating) continue;
      const pending = sampleClipAt(clip, screen, d);
      state = mergeSampledClips(state, pending);
      continue;
    }
    const at = tMs <= end ? tMs : end;
    state = mergeSampledClips(state, sampleClipAt(clip, screen, at));
  }
  return state;
};

/** True if this layer has any animation clip (mount, unmount, or legacy stagger). */
export const layerHasAnimationClips = (screen: Screen | undefined, layerId: string): boolean =>
  (screen?.animations ?? []).some((c) => c.targetLayerId === layerId);

/** Total time (ms) before the screen's animations are visually settled. */
export const screenAnimationsDurationMs = (screen: Screen): number => {
  if (!screen.animations || screen.animations.length === 0) return 0;
  let max = 0;
  for (const clip of screen.animations) {
    const total = effectiveDelayMs(clip, screen) + clip.durationMs;
    if (total > max) max = total;
  }
  return max;
};

/** End of the loader fill segment on the timeline (ms from screen mount), for one loader layer. */
export const loaderLayerFillTimelineEndMs = (layer: Extract<Layer, { kind: 'loader' }>): number =>
  (layer.fillDelayMs ?? 0) + (layer.durationMs ?? 2000);

/** Latest end time (ms from screen mount) of any loader timed fill on this screen. */
export const screenLoaderTimelineExtentMs = (screen: Screen): number => {
  let max = 0;
  walkScreen(screen, (l) => {
    if (l.kind !== 'loader') return;
    const end = loaderLayerFillTimelineEndMs(l);
    if (end > max) max = end;
  });
  return max;
};

/**
 * Fill progress 0–1 for scrubber / motion clock time `tMs` (linear; no easing).
 */
export const loaderFillProgressAtGlobalMs = (
  tMs: number,
  fillDelayMs: number,
  durationMs: number,
): number => {
  if (durationMs <= 0) return tMs >= fillDelayMs ? 1 : 0;
  return Math.min(1, Math.max(0, (tMs - fillDelayMs) / durationMs));
};

/** Default timeline play span when a Lottie layer has no {@link durationMs}. */
export const DEFAULT_LOTTIE_PLAY_DURATION_MS = 2_000;

type LottieJsonMeta = { fr?: number; ip?: number; op?: number };

/** Duration (ms) from Lottie JSON `ip` / `op` / `fr` when present. */
export const lottieJsonDurationMs = (animationData: object): number => {
  const j = animationData as LottieJsonMeta;
  const fr = typeof j.fr === 'number' && j.fr > 0 ? j.fr : 60;
  const ip = typeof j.ip === 'number' ? j.ip : 0;
  const op = typeof j.op === 'number' ? j.op : 60;
  const frames = Math.max(0, op - ip);
  return Math.max(1, Math.round((frames / fr) * 1000));
};

/**
 * @deprecated Prefer {@link workbenchTimelineTotalMs} from `@getrheo/flow-runtime/restingMotion`.
 * Kept for tests; returns mount/unmount clip extent only (no 10s floor).
 */
export const MIN_ANIMATION_TIMELINE_AUTHORING_SPAN_MS = 10_000;

/** Mount/unmount clip extent only — does not include loader/Lottie/video/resting spans. */
export const animationTimelineAuthoringEndMs = (screen: Screen): number =>
  screenAnimationsDurationMs(screen);

/**
 * Convert legacy `stagger` clips to `mount` with combined delay and drop
 * `screen.stagger` so authoring uses a single delay per clip.
 */
export const migrateStaggerClipsToMount = (screen: Screen): Screen => {
  const staggerClipPresent = screen.animations?.some((c) => c.trigger === 'stagger');
  const staggerFieldPresent = screen.stagger !== undefined;
  if (!staggerClipPresent && !staggerFieldPresent) return screen;

  const step = screen.stagger?.stepMs ?? 60;
  const { stagger: _st, ...rest } = screen;

  if (!staggerClipPresent) {
    return { ...rest };
  }

  const nextAnimations = (screen.animations ?? []).map((c) => {
    if (c.trigger !== 'stagger') return c;
    const base = c.delayMs ?? 0;
    const extra = (c.staggerIndex ?? 0) * step;
    return {
      ...c,
      trigger: 'mount' as const,
      delayMs: base + extra,
      staggerIndex: undefined,
    };
  });

  return { ...rest, animations: nextAnimations };
};

const hasStaggerClip = (screen: Screen, layerId: string): boolean =>
  (screen.animations ?? []).some((c) => c.targetLayerId === layerId && c.trigger === 'stagger');

/**
 * Reassigns `staggerIndex` on every stagger clip from **direct child order**
 * under each {@link StackLayer}. Matches how authors think about sibling
 * sequencing in the layer tree.
 */
export const applyStaggerIndicesFromTreeOrder = (screen: Screen): Screen => {
  if (!screen.animations?.some((c) => c.trigger === 'stagger')) return screen;

  const staggerIndexByLayerId = new Map<string, number>();

  const visitStackChildren = (stack: StackLayer): void => {
    let idx = 0;
    for (const ch of stack.children) {
      if (hasStaggerClip(screen, ch.id)) {
        staggerIndexByLayerId.set(ch.id, idx);
        idx += 1;
      }
      visit(ch);
    }
  };

  const visit = (l: Layer): void => {
    if (l.kind === 'stack') {
      visitStackChildren(l);
      return;
    }
    if (l.kind === 'carousel') {
      for (const s of l.slides) visit(s);
      return;
    }
    if (l.kind === 'button' || l.kind === 'back_button') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'hyperlink') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'single_choice' || l.kind === 'multiple_choice') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'text_input' || l.kind === 'scale_input') {
      l.children?.forEach(visit);
      return;
    }
    if (l.kind === 'oauth_login') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'oauth_provider' && l.variant === 'custom') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'email_password_auth') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'email_password_field') {
      l.children?.forEach(visit);
      return;
    }
    if (l.kind === 'email_password_submit') {
      l.children.forEach(visit);
      return;
    }
  };

  if (screen.regions.header) visit(screen.regions.header);
  visit(screen.regions.body);
  if (screen.regions.footer) visit(screen.regions.footer);

  const nextAnimations = screen.animations.map((c) => {
    if (c.trigger !== 'stagger') return c;
    const nextIdx = staggerIndexByLayerId.get(c.targetLayerId);
    if (nextIdx === undefined) return c;
    if (c.staggerIndex === nextIdx) return c;
    return { ...c, staggerIndex: nextIdx };
  });

  if (nextAnimations.every((c, i) => c === screen.animations![i])) return screen;
  return { ...screen, animations: nextAnimations };
};

/**
 * Index clips by `targetLayerId` so renderers don't re-walk the full
 * animations array per layer per frame.
 */
export const clipsByLayerId = (screen: Screen): Map<string, AnimationClip[]> => {
  const map = new Map<string, AnimationClip[]>();
  if (!screen.animations) return map;
  for (const clip of screen.animations) {
    const list = map.get(clip.targetLayerId) ?? [];
    list.push(clip);
    map.set(clip.targetLayerId, list);
  }
  return map;
};

/**
 * Reduced-motion policy used by every runtime. The default behavior is
 * conservative: animations snap to their final keyframe (no movement),
 * and screen transitions become instantaneous. Authors who want more
 * latitude can extend this in the future without diverging the
 * renderers.
 */
export type ReducedMotionPolicy = 'play' | 'snap-to-end';

export const applyReducedMotion = (
  clip: AnimationClip,
  policy: ReducedMotionPolicy,
): AnimationClip => {
  if (policy === 'play') return clip;
  return {
    ...clip,
    durationMs: 0,
    delayMs: 0,
    tracks: clip.tracks.map((t) => ({
      ...t,
      keyframes: t.keyframes.map((k) => ({ ...k, t: k.t === 0 ? 0 : 1 })),
    })),
  };
};

/**
 * Whitelist of animatable properties per layer kind. Keep this in sync
 * with renderer support so the editor can disable unsupported tracks
 * before they hit the manifest. Today every layer supports the same
 * style-token subset; we keep the function shape so future layer kinds
 * can opt-in / opt-out without schema changes.
 */
export const listAnimatablePropsForLayerKind = (
  _kind: LayerKind,
): readonly AnimatableProperty[] => ['opacity', 'translateX', 'translateY', 'scale'];

export const isPropertyAllowedOnLayer = (
  layer: Layer,
  property: AnimatableProperty,
): boolean => listAnimatablePropsForLayerKind(layer.kind).includes(property);
