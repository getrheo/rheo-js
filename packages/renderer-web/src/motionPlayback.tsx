import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  layerHasAnimationClips,
  sampleLayerAnimAt,
  screenAnimationsDurationMs,
  type SampledClip,
} from '@getrheo/flow-runtime/animations';
import {
  layerRestingMotionEntries,
  layerRestingMotionStartMs,
  motionTimelineScrubClampMs,
  restingMotionEffectiveDurationMs,
} from '@getrheo/flow-runtime/restingMotion';
import type { Screen } from '@getrheo/contracts/screens';
import { findLayerById } from '@getrheo/flow-runtime/layers';

/**
 * Per-screen animation controller used by the sim renderer. The
 * controller owns the playhead (in ms from screen mount) and exposes
 * just enough surface for editor tooling (scrubbing, preview-loop, etc.)
 * without coupling to React state for the per-frame value.
 *
 * Implementation notes
 * - The playhead lives in a ref to avoid re-rendering the whole layer
 *   tree on every animation frame; per-layer subscribers register
 *   themselves and receive `time` via a small pub/sub.
 * - When `mode === 'preview'`, the controller drives time itself (rAF).
 *   When `mode === 'scrub'`, the host sets `time` directly.
 */
export type MotionPlaybackMode = 'preview' | 'scrub' | 'paused';

type Listener = (time: number) => void;

export type MotionController = {
  screen: Screen;
  mode: MotionPlaybackMode;
  /**
   * Editor timeline end (ms from screen mount), including layer motion extent.
   * Mount/unmount clips alone end at {@link screenAnimationsDurationMs}; this matches
   * {@link motionTimelineScrubClampMs} so preview playback can run past the last exit clip.
   */
  durationMs: number;
  getTime: () => number;
  setTime: (t: number) => void;
  subscribe: (listener: Listener) => () => void;
};

const MotionContext = createContext<MotionController | null>(null);

export type MotionPlaybackProviderProps = {
  screen: Screen;
  /** Defaults to 'preview' so the screen plays in once on mount. */
  mode?: MotionPlaybackMode;
  /** Bumping this value re-runs the preview from t=0. */
  resetKey?: string | number;
  /**
   * When `mode === 'scrub'`, drives the playhead directly from React state
   * (editor timeline). Ignored for other modes.
   */
  scrubTimeMs?: number;
  /**
   * Called as the motion clock advances when `mode === 'preview'` (rAF-driven).
   * Not invoked for `scrub` or `paused` — avoids feedback loops with timeline state.
   * Ms are rounded to integers; duplicate values are skipped.
   */
  onPreviewTimeMs?: (ms: number) => void;
  /**
   * When `mode === 'preview'`, motion starts from this time (ms) instead of 0
   * so authors can resume after pausing mid-timeline.
   */
  previewStartMs?: number;
  /** Called once when preview playback reaches the end of the timeline (`scrubClampMs`). */
  onPreviewPlaybackComplete?: () => void;
  children: ReactNode;
};

/**
 * Hosts the per-screen motion clock. Designed to be safe to use in
 * environments without a window (SSR snapshots, tests) — the clock is
 * lazy-initialized so importing this module never touches `requestAnimationFrame`.
 */
export const MotionPlaybackProvider = ({
  screen,
  mode = 'preview',
  resetKey,
  scrubTimeMs = 0,
  previewStartMs = 0,
  onPreviewTimeMs,
  onPreviewPlaybackComplete,
  children,
}: MotionPlaybackProviderProps) => {
  const clipDurationMs = useMemo(() => screenAnimationsDurationMs(screen), [screen]);
  const scrubClampMs = useMemo(() => motionTimelineScrubClampMs(screen), [screen]);
  const timeRef = useRef(0);
  const listenersRef = useRef<Set<Listener>>(new Set());
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onPreviewTimeMsRef = useRef(onPreviewTimeMs);
  onPreviewTimeMsRef.current = onPreviewTimeMs;
  const previewTimeEmittedRef = useRef<number | null>(null);

  const onPreviewPlaybackCompleteRef = useRef(onPreviewPlaybackComplete);
  onPreviewPlaybackCompleteRef.current = onPreviewPlaybackComplete;

  const notify = (t: number): void => {
    timeRef.current = t;
    if (modeRef.current === 'preview' && onPreviewTimeMsRef.current) {
      const ms = Math.min(scrubClampMs, Math.max(0, t));
      const rounded = Math.round(ms);
      if (previewTimeEmittedRef.current !== rounded) {
        previewTimeEmittedRef.current = rounded;
        onPreviewTimeMsRef.current(rounded);
      }
    } else {
      previewTimeEmittedRef.current = null;
    }
    listenersRef.current.forEach((l) => l(t));
  };

  useEffect(() => {
    if (mode === 'scrub') {
      const t =
        clipDurationMs === 0 ? (scrubClampMs > 0 ? scrubTimeMs : 0) : scrubTimeMs;
      notify(Math.min(scrubClampMs, Math.max(0, t)));
      return;
    }

    if (mode !== 'preview') {
      notify(0);
      notify(mode === 'paused' ? scrubClampMs : clipDurationMs);
      return;
    }
    if (scrubClampMs === 0) {
      notify(0);
      return;
    }
    let from = Math.min(Math.max(0, previewStartMs), scrubClampMs);
    if (scrubClampMs > 0 && from >= scrubClampMs - 0.5) from = 0;
    notify(from);
    if (from >= scrubClampMs) {
      onPreviewPlaybackCompleteRef.current?.();
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number): void => {
      if (start === 0) start = now;
      const elapsed = now - start;
      const t = from + elapsed;
      if (t >= scrubClampMs) {
        notify(scrubClampMs);
        onPreviewPlaybackCompleteRef.current?.();
        return;
      }
      notify(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen.id, mode, clipDurationMs, scrubClampMs, resetKey, scrubTimeMs, previewStartMs]);

  const controller = useMemo<MotionController>(
    () => ({
      screen,
      mode,
      durationMs: scrubClampMs,
      getTime: () => timeRef.current,
      setTime: (t) => notify(Math.min(scrubClampMs, Math.max(0, t))),
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        listener(timeRef.current);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [screen, mode, scrubClampMs],
  );

  return <MotionContext.Provider value={controller}>{children}</MotionContext.Provider>;
};

export const useMotionController = (): MotionController | null =>
  useContext(MotionContext);

/**
 * Whether layer motion is active at the current timeline time (inside
 * [start, start + segment duration)).
 */
export const useRestingMotionAllowed = (layerId: string): boolean => {
  const controller = useMotionController();
  const bounds = useMemo(() => {
    if (!controller) return null;
    const layer = findLayerById(controller.screen, layerId);
    if (!layer) return null;
    const segments = layerRestingMotionEntries(layer);
    if (segments.length === 0) return null;
    return segments.map((cfg) => {
      const start = layerRestingMotionStartMs(controller.screen, layerId, cfg);
      const end = start + restingMotionEffectiveDurationMs(cfg);
      return { start, end };
    });
  }, [controller, layerId]);

  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!controller || !bounds) {
      setAllowed(false);
      return;
    }
    const ok = (t: number) => bounds.some((b) => t >= b.start && t < b.end);
    let prev = ok(controller.getTime());
    setAllowed(prev);
    return controller.subscribe((time) => {
      const next = ok(time);
      if (next !== prev) {
        prev = next;
        setAllowed(next);
      }
    });
  }, [controller, bounds]);

  return allowed;
};

/**
 * Subscribe to the motion clock and resolve mount + unmount sampled style
 * for `layerId` at the current timeline time.
 */
export const useLayerMotion = (layerId: string): SampledClip | null => {
  const controller = useContext(MotionContext);
  const hasAnim = useMemo(
    () => (controller ? layerHasAnimationClips(controller.screen, layerId) : false),
    [controller, layerId],
  );

  const initial = useMemo(() => {
    if (!controller || !hasAnim) return {};
    return sampleLayerAnimAt(controller.screen, layerId, 0);
  }, [controller, hasAnim, layerId]);

  const [sampled, setSampled] = useState<SampledClip>(initial);

  useEffect(() => {
    if (!controller || !hasAnim) return;
    return controller.subscribe((time) => {
      setSampled(sampleLayerAnimAt(controller.screen, layerId, time));
    });
  }, [controller, hasAnim, layerId]);

  return hasAnim ? sampled : null;
};

/**
 * Convert a sampled clip into a CSS `transform` + `opacity` block. Lives
 * in the sim runtime so the editor preview, the simulator, and any web
 * production usage share one mapping.
 */
export const motionStyleFromSample = (sample: SampledClip): CSSProperties => {
  const transforms: string[] = [];
  if (sample.translateX !== undefined) {
    transforms.push(`translateX(${sample.translateX}px)`);
  }
  if (sample.translateY !== undefined) {
    transforms.push(`translateY(${sample.translateY}px)`);
  }
  if (sample.scale !== undefined) {
    transforms.push(`scale(${sample.scale})`);
  }
  const style: CSSProperties = {};
  if (transforms.length > 0) style.transform = transforms.join(' ');
  if (sample.opacity !== undefined) style.opacity = sample.opacity;
  return style;
};

