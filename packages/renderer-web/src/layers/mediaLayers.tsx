import type { CSSProperties, ComponentType, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as IoIcons from 'react-icons/io5';
import {
  DEFAULT_THEMED_FOREGROUND,
  type IconLayer,
  type ImageLayer,
  type ImageStyle,
  type LottieLayer,
  type VideoLayer,
} from '@getrheo/contracts/layers';
import { resolveThemedColor } from '@getrheo/flow-runtime/layers';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import {
  resolveIconStyleAtWidth,
  resolveImageStyleAtWidth,
} from '@getrheo/flow-runtime/responsive/layerResolve';
import {
  commonCss,
  mediaChromeFillsMotionShell,
  mediaLayerInnerFillCss,
  mediaLayerOuterLayoutCss,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
  widthFor,
} from '../LayerRendererStyle';
import { SelectableWrap, type Ctx } from '../LayerRendererShared';
import { useMediaPlayback, useMediaPlaySignal } from '../mediaPlayback';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

/** Reuse parsed Lottie JSON across LayerRenderer remounts (e.g. animation preview). */
const lottieAnimationCache = new Map<string, object>();

/** Vitest: warm the in-memory Lottie JSON cache before rendering {@link LottieView}. */
export const primeLottieAnimationCache = (url: string, animation: object): void => {
  lottieAnimationCache.set(url, animation);
};

/** Static canvas poster: mid frame when the comp has duration, else in-point. */
const lottiePosterFrame = (animation: object): number => {
  const record = animation as { ip?: number; op?: number };
  const ip = typeof record.ip === 'number' ? record.ip : 0;
  const op = typeof record.op === 'number' ? record.op : ip;
  if (op <= ip + 1) return ip;
  return Math.floor((ip + op) / 2);
};

export const mediaAutoPlayOnMount = (layer: { autoPlay?: boolean }): boolean =>
  layer.autoPlay !== false;

const mediaPlaceholderBackground = (palette: 'light' | 'dark'): string =>
  palette === 'dark' ? '#18181b' : '#f4f4f5';

/** Gray fill only for empty media slots; author background (incl. transparent) always wins. */
const mediaInnerCss = (
  resolvedStyle: ImageStyle | undefined,
  ctx: Ctx,
  showPlaceholderBg: boolean,
  /** When false, omit implicit radius 10 (ImageView). Lottie/video keep the legacy default. */
  applyDefaultRadius = true,
): CSSProperties => {
  const hasAuthorBg =
    resolvedStyle?.background !== undefined &&
    resolvedStyle.background !== 'transparent';
  const radius =
    resolvedStyle?.radius !== undefined
      ? resolvedStyle.radius
      : applyDefaultRadius
        ? 10
        : undefined;
  return {
    ...mediaLayerInnerFillCss(resolvedStyle),
    ...(radius !== undefined ? { borderRadius: radius } : {}),
    ...(!hasAuthorBg && showPlaceholderBg
      ? { background: mediaPlaceholderBackground(ctx.theme) }
      : {}),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: '#71717a',
    overflow: 'hidden',
  };
};

const mediaContentCss = (resolvedStyle: ImageStyle | undefined): CSSProperties => ({
  objectFit: resolvedStyle?.fit ?? 'cover',
  ...(resolvedStyle?.radius !== undefined ? { borderRadius: resolvedStyle.radius } : {}),
});

/** Inner flex surface for loaded raster/SVG media (mirrors lottie/video wrapper). */
const mediaLoadedInnerCss = (resolvedStyle: ImageStyle | undefined): CSSProperties => ({
  ...mediaLayerInnerFillCss(resolvedStyle),
  ...(resolvedStyle?.radius !== undefined ? { borderRadius: resolvedStyle.radius } : {}),
  display: 'flex',
  overflow: 'hidden',
});

const fireMediaOnComplete = (ctx: Ctx, layer: LottieLayer | VideoLayer): void => {
  if (layer.loop !== false) return;
  const mode = layer.onComplete?.mode ?? 'none';
  if (mode === 'none' || !ctx.interactive) return;
  if (mode === 'next') ctx.onRespond?.({ kind: 'cta', action: 'primary' });
  else if (mode === 'screen' && layer.onComplete?.mode === 'screen')
    ctx.onRespond?.({ kind: 'go_to_screen', screenId: layer.onComplete.screenId });
};

export const ImageView = ({ layer, ctx }: { layer: ImageLayer; ctx: Ctx }) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedStyle = resolveImageStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const url = layer.media ? ctx.mediaMap?.[layer.media.mediaAssetId] : undefined;
  const hugWidth = resolvedStyle?.width === 'auto' || resolvedStyle?.width === undefined;
  const hugHeight = resolvedStyle?.height === 'auto' || resolvedStyle?.height === undefined;
  const useIntrinsicSize = hugWidth && hugHeight;
  const [intrinsicSize, setIntrinsicSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const outerChrome = mediaLayerOuterLayoutCss(
    resolvedStyle,
    ctx.manifest.theme,
    ctx.theme,
    ctx.branding,
    ctx.parentStackDirection,
  );
  const shellFill = mediaChromeFillsMotionShell(resolvedStyle, ctx.parentStackDirection);
  const outerStyle = { ...outerChrome, ...shellFill };
  const placeholderInner = mediaInnerCss(resolvedStyle, ctx, !url, false);
  const loadedInner = useIntrinsicSize
    ? (outerChrome.borderRadius !== undefined ? { borderRadius: outerChrome.borderRadius } : {})
    : mediaLoadedInnerCss(resolvedStyle);
  const r = loadedInner.borderRadius as number | undefined;
  const imgStyle: CSSProperties = useIntrinsicSize
    ? {
        width: intrinsicSize?.width,
        height: intrinsicSize?.height,
        ...(r !== undefined ? { borderRadius: r } : {}),
      }
    : {
        ...mediaContentCss(resolvedStyle),
        width: '100%',
        height: '100%',
        ...(r !== undefined ? { borderRadius: r } : {}),
      };
  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outerStyle}>
      {url ? (
        <div style={loadedInner}>
          <img
            src={url}
            alt={layer.alt ?? ''}
            style={imgStyle}
            onLoad={(event) => {
              if (!useIntrinsicSize) return;
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth > 0 && naturalHeight > 0) {
                setIntrinsicSize({ width: naturalWidth, height: naturalHeight });
              }
            }}
          />
        </div>
      ) : (
        <div style={placeholderInner}>{layer.alt?.trim() ? layer.alt : 'Image'}</div>
      )}
    </SelectableWrap>
  );
};

export const LottieView = ({ layer, ctx }: { layer: LottieLayer; ctx: Ctx }) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedStyle = resolveImageStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const url = layer.media ? ctx.mediaMap?.[layer.media.mediaAssetId] : undefined;
  const authoringPreview = ctx.authoringPreview === true;
  const playback = useMediaPlayback();
  const playSignal = useMediaPlaySignal(layer.id);
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);
  const completedRef = useRef(false);
  const [data, setData] = useState<object | null>(() =>
    url ? (lottieAnimationCache.get(url) ?? null) : null,
  );
  const [loadErr, setLoadErr] = useState(false);
  const loopPlay = layer.loop !== false;
  const shouldAutoplay = !authoringPreview && mediaAutoPlayOnMount(layer);
  const [playing, setPlaying] = useState(() => shouldAutoplay);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoadErr(false);
      return;
    }
    const cached = lottieAnimationCache.get(url);
    if (cached) {
      setLoadErr(false);
      setData(cached);
      return;
    }
    let cancelled = false;
    setLoadErr(false);
    setData(null);
    void fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<object>;
      })
      .then((j) => {
        if (!cancelled) {
          lottieAnimationCache.set(url, j);
          setData(j);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadErr(true);
          setData(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const pauseAtPosterFrame = useCallback((): void => {
    const inst = lottieRef.current;
    if (!inst) return;
    inst.stop();
    const frame = data ? lottiePosterFrame(data) : 0;
    inst.goToAndStop(frame, true);
  }, [data]);

  const play = useCallback(() => {
    if (authoringPreview) {
      pauseAtPosterFrame();
      return;
    }
    if (playingRef.current) return;
    completedRef.current = false;
    setPlaying(true);
    const inst = lottieRef.current;
    if (!inst) return;
    inst.stop();
    inst.goToAndPlay(0, true);
  }, [authoringPreview, pauseAtPosterFrame]);

  useEffect(() => {
    if (authoringPreview || !playback) return;
    return playback.register(layer.id, { play });
  }, [authoringPreview, playback, layer.id, play]);

  useEffect(() => {
    if (!shouldAutoplay) {
      setPlaying(false);
      lottieRef.current?.stop();
      if (authoringPreview && data) pauseAtPosterFrame();
      return;
    }
    if (data) play();
  }, [
    shouldAutoplay,
    data,
    play,
    ctx.screen.id,
    layer.id,
    authoringPreview,
    pauseAtPosterFrame,
  ]);

  useEffect(() => {
    if (authoringPreview || shouldAutoplay || playSignal === 0) return;
    play();
  }, [authoringPreview, playSignal, shouldAutoplay, play]);

  useEffect(() => {
    if (!data || !authoringPreview) return;
    setPlaying(false);
    pauseAtPosterFrame();
  }, [data, authoringPreview, pauseAtPosterFrame]);

  const showPlaceholderBg = !url || loadErr || !data;
  const outerChrome = mediaLayerOuterLayoutCss(
    resolvedStyle,
    ctx.manifest.theme,
    ctx.theme,
    ctx.branding,
    ctx.parentStackDirection,
  );
  const shellFill = mediaChromeFillsMotionShell(resolvedStyle, ctx.parentStackDirection);
  const outerStyle = { ...outerChrome, ...shellFill };
  const innerStyle = mediaInnerCss(resolvedStyle, ctx, showPlaceholderBg);
  const loadingStyle: CSSProperties = {
    ...mediaLayerInnerFillCss(resolvedStyle),
    borderRadius: resolvedStyle?.radius ?? 10,
    background: 'transparent',
    overflow: 'hidden',
  };

  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outerStyle}>
      {!url ? (
        <div style={innerStyle}>No media</div>
      ) : loadErr ? (
        <div style={innerStyle}>Could not load animation</div>
      ) : !data ? (
        <div style={loadingStyle} aria-hidden />
      ) : (
        <div style={innerStyle}>
          <Lottie
            lottieRef={lottieRef}
            animationData={data}
            autoplay={playing}
            loop={authoringPreview ? false : loopPlay}
            onComplete={() => {
              if (loopPlay || completedRef.current) return;
              completedRef.current = true;
              fireMediaOnComplete(ctx, layer);
            }}
            onLoopComplete={() => {
              if (!loopPlay) return;
            }}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}
    </SelectableWrap>
  );
};

export const VideoView = ({ layer, ctx }: { layer: VideoLayer; ctx: Ctx }) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedStyle = resolveImageStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const url = layer.media ? ctx.mediaMap?.[layer.media.mediaAssetId] : undefined;
  const authoringPreview = ctx.authoringPreview === true;
  const playback = useMediaPlayback();
  const playSignal = useMediaPlaySignal(layer.id);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const loopPlay = layer.loop !== false;
  const shouldAutoplay = !authoringPreview && mediaAutoPlayOnMount(layer);
  /** Dashboard never plays video audio; SDK embeds honor {@link VideoLayer.audioEnabled}. */
  const muted = authoringPreview || layer.audioEnabled !== true;

  const pauseAtStart = useCallback((): void => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      // seek before metadata ready
    }
  }, []);

  const play = useCallback(() => {
    if (authoringPreview) {
      pauseAtStart();
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    if (!el.paused && !el.ended) return;
    completedRef.current = false;
    void el.play().catch(() => undefined);
  }, [authoringPreview, pauseAtStart]);

  useEffect(() => {
    if (authoringPreview || !playback) return;
    return playback.register(layer.id, { play });
  }, [authoringPreview, playback, layer.id, play]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    if (authoringPreview || !shouldAutoplay) {
      pauseAtStart();
      return;
    }
    void el.play().catch(() => undefined);
  }, [authoringPreview, shouldAutoplay, muted, url, ctx.screen.id, layer.id, pauseAtStart]);

  useEffect(() => {
    if (authoringPreview || shouldAutoplay || playSignal === 0) return;
    play();
  }, [authoringPreview, playSignal, shouldAutoplay, play]);

  const showPlaceholderBg = !url;
  const outerChrome = mediaLayerOuterLayoutCss(
    resolvedStyle,
    ctx.manifest.theme,
    ctx.theme,
    ctx.branding,
    ctx.parentStackDirection,
  );
  const shellFill = mediaChromeFillsMotionShell(resolvedStyle, ctx.parentStackDirection);
  const outerStyle = { ...outerChrome, ...shellFill };
  const innerStyle = mediaInnerCss(resolvedStyle, ctx, showPlaceholderBg);
  const videoStyle: CSSProperties = {
    ...mediaContentCss(resolvedStyle),
    width: '100%',
    height: '100%',
  };

  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outerStyle}>
      {!url ? (
        <div style={innerStyle}>No media</div>
      ) : (
        <div style={innerStyle}>
          <video
            ref={videoRef}
            src={url}
            muted={muted}
            playsInline
            preload={authoringPreview ? 'metadata' : 'auto'}
            loop={authoringPreview ? false : loopPlay}
            onLoadedData={authoringPreview ? pauseAtStart : undefined}
            onEnded={() => {
              if (authoringPreview || loopPlay || completedRef.current) return;
              completedRef.current = true;
              fireMediaOnComplete(ctx, layer);
            }}
            style={videoStyle}
          />
        </div>
      )}
    </SelectableWrap>
  );
};

const ionKebabToIo5Export = (kebab: string): string =>
  `Io${kebab
    .split('-')
    .map((s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''))
    .join('')}`;

export const IconView = ({ layer, ctx }: { layer: IconLayer; ctx: Ctx }) => {
  const w = ctx.previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolvedStyle = resolveIconStyleAtWidth(layer.style, layer.styleBreakpoints, w);
  const rawH = resolvedStyle?.height;
  const rawW = resolvedStyle?.width;
  // Glyph fits the box (`min(width, height)`); no `style.size`.
  const glyphNum =
    typeof rawW === 'number' && typeof rawH === 'number'
      ? Math.max(8, Math.min(rawW, rawH))
      : typeof rawH === 'number'
        ? rawH
        : typeof rawW === 'number'
          ? rawW
          : 24;
  const resolvedColor = resolveThemedColor(
    ctx.manifest.theme,
    ctx.theme,
    resolvedStyle?.color ?? DEFAULT_THEMED_FOREGROUND,
  ) as string;
  const stripped = stripCommonLayoutForInner(
    stripFlowAxesForFlexChild(resolvedStyle, ctx.parentStackDirection),
  );
  const widthCss =
    resolvedStyle?.position !== 'absolute' && ctx.parentStackDirection === undefined
      ? widthFor(rawW)
      : undefined;
  const heightCss =
    resolvedStyle?.position !== 'absolute' && ctx.parentStackDirection === undefined
      ? typeof rawH === 'number'
        ? rawH
        : rawH === 'fill' || rawH === 'full'
          ? '100%'
          : undefined
      : undefined;

  const outer: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    lineHeight: 0,
    ...commonCss(stripped, ctx.manifest.theme, ctx.theme, ctx.branding),
    ...(widthCss !== undefined ? { width: widthCss } : {}),
    ...(heightCss !== undefined ? { height: heightCss } : {}),
  };

  const glyphInnerBox: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  let glyph: ReactNode;
  if (layer.family === 'ionicons') {
    const exportName = ionKebabToIo5Export(layer.iconName.trim());
    const Cmp = (IoIcons as Record<string, ComponentType<{ size?: string | number; color?: string }>>)[
      exportName
    ];
    glyph = Cmp ? (
      <div style={glyphInnerBox}>
        <Cmp size={glyphNum} color={resolvedColor} />
      </div>
    ) : (
      <span style={{ fontSize: 11, color: '#71717a' }} title={layer.iconName}>
        ?
      </span>
    );
  } else {
    glyph = (
      <span style={{ fontSize: 11, color: '#71717a' }} title={layer.iconName}>
        ?
      </span>
    );
  }

  return (
    <SelectableWrap layer={layer} ctx={ctx} outerStyle={outer}>
      {glyph}
    </SelectableWrap>
  );
};
