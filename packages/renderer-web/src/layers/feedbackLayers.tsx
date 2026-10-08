import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CounterLayer, LoaderLayer, ProgressLayer } from '@getrheo/contracts/layers';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import { loaderFillProgressAtGlobalMs } from '@getrheo/flow-runtime/animations';
import {
  formatCounterLayerDisplay,
  resolveCounterAnimationDurationMs,
} from '@getrheo/flow-runtime/counterLayer';
import { multiplyColorAlpha } from '@getrheo/flow-runtime';
import { findManualSubmitInputLayer, resolveThemedColor } from '@getrheo/flow-runtime/layers';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import {
  resolveLoaderCircularSizePx,
  resolveLoaderLinearHeightPx,
  resolveLoaderStrokeWidthPx,
  resolveProgressLinearHeightPx,
  resolveTextStyleAtWidth,
} from '@getrheo/flow-runtime/responsive/layerResolve';
import { useMotionController } from '../motionPlayback';
import {
  commonCss,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
  textCss,
} from '../LayerRendererStyle';
import { SelectableWrap, type Ctx } from '../LayerRendererShared';

const loaderAlignJustify: Record<
  NonNullable<LoaderLayer['align']>,
  CSSProperties['justifyContent']
> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
};

const loaderContentLayoutCss = (align: LoaderLayer['align'] | undefined): CSSProperties => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: loaderAlignJustify[align ?? 'start'],
});

const flowProgressRatio = (manifest: FlowManifest, screenId: string): number => {
  const n = manifest.screens.length;
  if (n === 0) return 0;
  const i = manifest.screens.findIndex((s) => s.id === screenId);
  const step = i >= 0 ? i + 1 : 1;
  return Math.min(1, Math.max(0, step / n));
};

export const ProgressView = ({ layer, ctx }: { layer: ProgressLayer; ctx: Ctx }) => {
  const ratio = flowProgressRatio(ctx.manifest, ctx.screen.id);
  // Bar height: authored via `style.height` (px); resolver supplies the
  // per-kind default for sparse manifests.
  const h = resolveProgressLinearHeightPx(layer.style?.height);
  const track =
    (resolveThemedColor(ctx.manifest.theme, ctx.theme, layer.trackColor) as string | undefined) ??
    (ctx.theme === 'dark' ? '#3f3f46' : '#e4e4e7');
  const fillResolved = resolveThemedColor(ctx.manifest.theme, ctx.theme, layer.fillColor);
  const fillFromTheme = ctx.manifest.theme?.primary
    ? (resolveThemedColor(ctx.manifest.theme, ctx.theme, ctx.manifest.theme.primary) as string | undefined)
    : undefined;
  const fill =
    (fillResolved as string | undefined) ??
    fillFromTheme ??
    (ctx.theme === 'dark' ? '#fafafa' : '#0a0a0a');
  const stripped = stripCommonLayoutForInner(
    stripFlowAxesForFlexChild(layer.style, ctx.parentStackDirection),
  );
  const outer: CSSProperties = {
    ...commonCss(stripped, ctx.manifest.theme, ctx.theme, ctx.branding),
  };
  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outer}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        style={{
          height: h,
          borderRadius: Math.max(2, h / 2),
          background: track,
          overflow: 'hidden',
        }}
      >
        <div style={{ width: `${ratio * 100}%`, height: '100%', background: fill }} />
      </div>
    </SelectableWrap>
  );
};

export const LoaderView = ({ layer, ctx }: { layer: LoaderLayer; ctx: Ctx }) => {
  const targetPct = layer.targetPercent ?? 100;
  const durationMs = layer.durationMs ?? 2000;
  const fillDelayMs = layer.fillDelayMs ?? 0;
  const variant = layer.variant ?? 'linear';
  const controller = useMotionController();
  const completedRef = useRef(false);

  const [standaloneProgress01, setStandaloneProgress01] = useState<number>(() =>
    !ctx.interactive ? 1 : 0,
  );
  const [timelineMs, setTimelineMs] = useState(0);

  useEffect(() => {
    if (!controller) return;
    const apply = () => setTimelineMs(controller.getTime());
    apply();
    return controller.subscribe(apply);
  }, [controller]);

  const trackBase =
    (resolveThemedColor(ctx.manifest.theme, ctx.theme, layer.trackColor) as string | undefined) ??
    (ctx.theme === 'dark' ? '#3f3f46' : '#e4e4e7');
  const track = multiplyColorAlpha(trackBase, layer.trackOpacity) ?? trackBase;
  const fillResolved = resolveThemedColor(ctx.manifest.theme, ctx.theme, layer.fillColor);
  const fillFromTheme = ctx.manifest.theme?.primary
    ? (resolveThemedColor(ctx.manifest.theme, ctx.theme, ctx.manifest.theme.primary) as string | undefined)
    : undefined;
  const fillColor =
    (fillResolved as string | undefined) ??
    fillFromTheme ??
    (ctx.theme === 'dark' ? '#fafafa' : '#0a0a0a');

  const stripped = stripCommonLayoutForInner(
    stripFlowAxesForFlexChild(layer.style, ctx.parentStackDirection),
  );
  const outer: CSSProperties = {
    ...commonCss(stripped, ctx.manifest.theme, ctx.theme, ctx.branding),
    ...loaderContentLayoutCss(layer.align),
  };

  const useMotionTimeline =
    controller != null &&
    (ctx.interactive || controller.mode === 'scrub' || controller.mode === 'preview');
  const motionProgress01 = useMotionTimeline
    ? loaderFillProgressAtGlobalMs(timelineMs, fillDelayMs, durationMs)
    : null;
  const progress01 = motionProgress01 ?? standaloneProgress01;
  const fillRatio = progress01 * (targetPct / 100);
  const onComplete = layer.onComplete ?? { mode: 'none' as const };
  const onCompleteMode = onComplete.mode;
  const onCompleteScreenId = onComplete.mode === 'screen' ? onComplete.screenId : '';

  const onRespondRef = useRef(ctx.onRespond);
  onRespondRef.current = ctx.onRespond;

  useLayoutEffect(() => {
    if (controller != null) return undefined;
    completedRef.current = false;
    if (!ctx.interactive) {
      setStandaloneProgress01(1);
      return undefined;
    }
    setStandaloneProgress01(0);
    let cancelled = false;
    let raf = 0;
    const runRamp = (): void => {
      raf = window.requestAnimationFrame(() => {
        if (!cancelled) setStandaloneProgress01(1);
      });
    };
    const tid = window.setTimeout(() => {
      if (!cancelled) runRamp();
    }, fillDelayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [
    controller,
    ctx.interactive,
    ctx.screen.id,
    layer.id,
    targetPct,
    durationMs,
    fillDelayMs,
    variant,
  ]);

  useEffect(() => {
    if (!ctx.interactive) return;
    if (onCompleteMode === 'none') return;
    const fire = (): void => {
      if (completedRef.current) return;
      completedRef.current = true;
      if (findManualSubmitInputLayer(ctx.screen) != null) {
        return;
      }
      if (onCompleteMode === 'next') onRespondRef.current?.({ kind: 'cta', action: 'primary' });
      else if (onCompleteMode === 'screen')
        onRespondRef.current?.({ kind: 'go_to_screen', screenId: onCompleteScreenId });
    };
    const afterMs =
      durationMs <= 0 ? fillDelayMs : fillDelayMs + durationMs;
    if (afterMs <= 0) {
      const t = globalThis.setTimeout(fire, 0);
      return () => globalThis.clearTimeout(t);
    }
    const t = globalThis.setTimeout(fire, afterMs);
    return () => globalThis.clearTimeout(t);
  }, [
    controller,
    ctx.interactive,
    durationMs,
    fillDelayMs,
    layer.id,
    onCompleteMode,
    onCompleteScreenId,
    ctx.screen,
    ctx.screen.id,
  ]);

  const useCssEase =
    controller == null &&
    ctx.interactive &&
    durationMs > 0;
  const widthTransition = useCssEase ? `width ${durationMs}ms linear` : undefined;

  if (variant === 'circular') {
    // Circular size = `style.width` (validated equal to `style.height`); ring
    // thickness = `style.strokeWidth`. Resolvers supply the per-kind default
    // when the manifest omits them so the canvas still renders something.
    const size = resolveLoaderCircularSizePx(layer.style?.width);
    const strokeW = resolveLoaderStrokeWidthPx(layer.style?.strokeWidth);
    const r = Math.max(1, (size - strokeW) / 2);
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - fillRatio);
    const dashTransition = useCssEase ? `stroke-dashoffset ${durationMs}ms linear` : undefined;

    return (
      <SelectableWrap layer={layer} ctx={ctx} outerStyle={outer}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: 'block' }}
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={track}
            strokeWidth={strokeW}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: dashTransition }}
          />
        </svg>
      </SelectableWrap>
    );
  }

  // Linear loader bar height = `style.height` (px); resolver supplies the
  // per-kind default when the manifest omits it.
  const h = resolveLoaderLinearHeightPx(layer.style?.height);
  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outer}>
      <div
        style={{
          width: '100%',
          alignSelf: 'stretch',
          height: h,
          borderRadius: Math.max(2, h / 2),
          background: track,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${fillRatio * 100}%`,
            height: '100%',
            background: fillColor,
            transition: widthTransition,
          }}
        />
      </div>
    </SelectableWrap>
  );
};

export const CounterView = ({ layer, ctx }: { layer: CounterLayer; ctx: Ctx }) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedStyle = resolveTextStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const delayMs = layer.delayMs ?? 0;
  const startVal = layer.startValue;
  const endVal = layer.endValue;
  const decimalPlaces = layer.decimalPlaces ?? 0;
  const displayKind = layer.displayKind ?? 'number';
  const timeFormat = layer.timeFormat ?? 'mm_ss';
  const durationMs = resolveCounterAnimationDurationMs({
    displayKind,
    durationMs: layer.durationMs,
    startValue: layer.startValue,
    endValue: layer.endValue,
  });

  const dispOpts = useMemo(
    () => ({ displayKind, decimalPlaces, timeFormat }),
    [displayKind, decimalPlaces, timeFormat],
  );
  const fmt = (v: number) => formatCounterLayerDisplay(v, dispOpts);
  const frozenPreview = !ctx.interactive;

  const [display, setDisplay] = useState(() => {
    if (frozenPreview) return fmt(startVal);
    const instant = durationMs <= 0 || startVal === endVal;
    if (instant && delayMs <= 0) {
      return fmt(endVal);
    }
    return fmt(startVal);
  });

  useEffect(() => {
    if (frozenPreview) {
      setDisplay(fmt(startVal));
      return;
    }

    const instant = durationMs <= 0 || startVal === endVal;

    if (instant) {
      setDisplay(fmt(startVal));
      if (delayMs <= 0) {
        setDisplay(fmt(endVal));
        return;
      }
      const timeoutId = window.setTimeout(() => {
        setDisplay(fmt(endVal));
      }, delayMs);
      return () => clearTimeout(timeoutId);
    }

    setDisplay(fmt(startVal));
    let raf = 0;
    const startAnim = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / durationMs);
        const v = startVal + (endVal - startVal) * t;
        setDisplay(fmt(v));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    let timeoutId = 0;
    if (delayMs <= 0) startAnim();
    else timeoutId = window.setTimeout(startAnim, delayMs);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      cancelAnimationFrame(raf);
    };
  }, [delayMs, durationMs, dispOpts, frozenPreview, startVal, endVal]);

  const innerStyle = stripFlowAxesForFlexChild(resolvedStyle, ctx.parentStackDirection);
  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={{}}>
      <div style={textCss(innerStyle, ctx.manifest.theme, ctx.theme, ctx.branding)}>
        {display}
      </div>
    </SelectableWrap>
  );
};
