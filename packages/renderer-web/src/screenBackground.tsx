'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { Branding } from '@getrheo/contracts/branding';
import type { Theme } from '@getrheo/contracts/manifest';
import type { Screen, ScreenBackgroundFill, ScreenBackgroundFit, ScreenBackgroundScrim, ScreenContainerStyle, ScreenContainerStyleBreakpoints } from '@getrheo/contracts';
import { screenBackgroundPlaybackId } from '@getrheo/contracts';
import type { StepResponse } from '@getrheo/flow-runtime/stateMachine';
import { resolveThemedBackground, resolveThemedColor } from '@getrheo/flow-runtime/layers';
import { resolveScreenContainerStyleAtWidth } from '@getrheo/flow-runtime/responsive/screenContainerResolve';
import { DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX } from '@getrheo/flow-runtime/responsive/breakpoints';
import { multiplyColorAlpha } from '@getrheo/flow-runtime/colorAlpha';
import { useMediaPlayback, useMediaPlaySignal } from './mediaPlayback';
import { mediaAutoPlayOnMount } from './layers/mediaLayers';

const shellBackdropBase: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
};

const objectFitFor = (fit: ScreenBackgroundFit | undefined): CSSProperties['objectFit'] =>
  fit ?? 'cover';

const scrimCss = (
  scrim: ScreenBackgroundScrim | undefined,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
): CSSProperties | undefined => {
  if (!scrim?.color && scrim?.opacity === undefined) return undefined;
  const raw = resolveThemedColor(theme, palette, scrim.color) as string | undefined;
  const color = multiplyColorAlpha(raw ?? 'rgba(0,0,0,0.45)', scrim.opacity ?? 0.45);
  return {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    background: color,
    pointerEvents: 'none',
  };
};

export const resolveShellColorFillCss = (
  fill: Extract<ScreenBackgroundFill, { kind: 'color' }>,
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  branding?: Branding,
): CSSProperties => {
  const bg = resolveThemedBackground(theme, branding, palette, fill.color) as string | undefined;
  if (!bg) return {};
  const background =
    fill.opacity !== undefined ? multiplyColorAlpha(bg, fill.opacity) ?? bg : bg;
  return { background };
};

const ColorBackdrop = ({
  fill,
  theme,
  palette,
  branding,
}: {
  fill: Extract<ScreenBackgroundFill, { kind: 'color' }>;
  theme: Theme | undefined;
  palette: 'light' | 'dark';
  branding?: Branding;
}) => {
  const css = resolveShellColorFillCss(fill, theme, palette, branding);
  if (!css.background) return null;
  return <div style={{ ...shellBackdropBase, ...css }} aria-hidden />;
};

const ImageBackdrop = ({
  url,
  fit,
  opacity,
  scrim,
  theme,
  palette,
  branding: _branding,
}: {
  url: string;
  fit?: ScreenBackgroundFit;
  opacity?: number;
  scrim?: ScreenBackgroundScrim;
  theme: Theme | undefined;
  palette: 'light' | 'dark';
  branding?: Branding;
}) => (
  <>
    <img
      src={url}
      alt=""
      aria-hidden
      style={{
        ...shellBackdropBase,
        width: '100%',
        height: '100%',
        objectFit: objectFitFor(fit),
        opacity: opacity ?? 1,
      }}
    />
    {scrimCss(scrim, theme, palette) ? (
      <div style={scrimCss(scrim, theme, palette)} aria-hidden />
    ) : null}
  </>
);

const ShellVideoBackdrop = ({
  screenId,
  url,
  fill,
  canvasPosterMode,
  interactive,
  onRespond,
}: {
  screenId: string;
  url: string;
  fill: Extract<ScreenBackgroundFill, { kind: 'video' }>;
  canvasPosterMode?: boolean;
  interactive: boolean;
  onRespond?: (r: StepResponse) => void;
}) => {
  const playbackId = screenBackgroundPlaybackId(screenId);
  const playback = useMediaPlayback();
  const playSignal = useMediaPlaySignal(playbackId);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const loopPlay = fill.loop !== false;
  const shouldAutoplay = !canvasPosterMode && mediaAutoPlayOnMount(fill);
  /** Dashboard / canvas never plays shell video audio; SDK honors {@link ScreenBackgroundVideoFill.audioEnabled}. */
  const muted = canvasPosterMode || fill.audioEnabled !== true;

  const pauseAtStart = useCallback((): void => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      // metadata not ready
    }
  }, []);

  const play = useCallback(() => {
    if (canvasPosterMode) {
      pauseAtStart();
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    if (!el.paused && !el.ended) return;
    completedRef.current = false;
    void el.play().catch(() => undefined);
  }, [canvasPosterMode, pauseAtStart]);

  useEffect(() => {
    if (canvasPosterMode || !playback) return;
    return playback.register(playbackId, { play });
  }, [canvasPosterMode, playback, playbackId, play]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    if (canvasPosterMode || !shouldAutoplay) {
      pauseAtStart();
      return;
    }
    void el.play().catch(() => undefined);
  }, [canvasPosterMode, shouldAutoplay, muted, url, pauseAtStart]);

  useEffect(() => {
    if (canvasPosterMode || shouldAutoplay || playSignal === 0) return;
    play();
  }, [canvasPosterMode, playSignal, shouldAutoplay, play]);

  return (
    <video
      ref={videoRef}
      src={url}
      muted={muted}
      playsInline
      preload={canvasPosterMode ? 'metadata' : 'auto'}
      loop={canvasPosterMode ? false : loopPlay}
      onLoadedData={canvasPosterMode ? pauseAtStart : undefined}
      onEnded={() => {
        if (canvasPosterMode || loopPlay || completedRef.current) return;
        completedRef.current = true;
        const mode = fill.onComplete?.mode ?? 'none';
        if (mode === 'none' || !interactive) return;
        if (mode === 'next') onRespond?.({ kind: 'cta', action: 'primary' });
      }}
      aria-hidden
      style={{
        ...shellBackdropBase,
        width: '100%',
        height: '100%',
        objectFit: objectFitFor(fill.fit),
        opacity: fill.opacity ?? 1,
      }}
    />
  );
};

export const ScreenShellBackdrop = ({
  screen,
  theme,
  palette,
  branding,
  mediaMap,
  previewWidthPx,
  canvasPosterMode,
  interactive,
  onRespond,
}: {
  screen: Screen;
  theme: Theme | undefined;
  palette: 'light' | 'dark';
  branding?: Branding;
  mediaMap?: Record<string, string>;
  previewWidthPx?: number;
  canvasPosterMode?: boolean;
  interactive?: boolean;
  onRespond?: (r: StepResponse) => void;
}) => {
  const w = previewWidthPx ?? DEFAULT_PREVIEW_VIEWPORT_WIDTH_PX;
  const resolved = resolveScreenContainerStyleAtWidth(
    screen.containerStyle,
    screen.containerStyleBreakpoints,
    w,
  );
  const fill = resolved?.backgroundFill;
  if (!fill) return null;

  if (fill.kind === 'color') {
    return <ColorBackdrop fill={fill} theme={theme} palette={palette} branding={branding} />;
  }

  const mediaId = fill.media?.mediaAssetId;
  const url = mediaId ? mediaMap?.[mediaId] : undefined;
  if (!url) return null;

  if (fill.kind === 'image') {
    return (
      <>
        <ImageBackdrop
          url={url}
          fit={fill.fit}
          opacity={fill.opacity}
          scrim={fill.scrim}
          theme={theme}
          palette={palette}
          branding={branding}
        />
      </>
    );
  }

  return (
    <>
      <ShellVideoBackdrop
        screenId={screen.id}
        url={url}
        fill={fill}
        canvasPosterMode={canvasPosterMode}
        interactive={interactive === true}
        onRespond={onRespond}
      />
      {scrimCss(fill.scrim, theme, palette) ? (
        <div style={scrimCss(fill.scrim, theme, palette)} aria-hidden />
      ) : null}
    </>
  );
};

export const shellUsesMediaBackdrop = (
  containerStyle: ScreenContainerStyle | undefined,
  breakpoints: ScreenContainerStyleBreakpoints | undefined,
  widthPx: number,
  mediaMap?: Record<string, string>,
): boolean => {
  const resolved = resolveScreenContainerStyleAtWidth(containerStyle, breakpoints, widthPx);
  const fill = resolved?.backgroundFill;
  if (!fill || fill.kind === 'color') return false;
  const mediaId = fill.media?.mediaAssetId;
  return !!(mediaId && mediaMap?.[mediaId]);
};
