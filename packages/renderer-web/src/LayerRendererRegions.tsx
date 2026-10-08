import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { StackLayer } from '@getrheo/contracts/layers';
import type { Ctx } from './LayerRendererShared.js';

export type LayerViewComponent = ({
  layer,
  ctx,
}: {
  layer: import('@getrheo/contracts/layers').Layer;
  ctx: Ctx;
}) => React.ReactNode;

type RegionKind = 'header' | 'body' | 'footer';

/** Overlaid on the region so labels never consume layout space (canvas ≈ flow preview). */
const regionLabelOverlayStyle: CSSProperties = {
  position: 'absolute',
  top: 4,
  left: 8,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  pointerEvents: 'none',
};

const regionLabelBadgeStyle = (theme: 'light' | 'dark'): CSSProperties => ({
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  padding: '2px 5px',
  borderRadius: 4,
  background: theme === 'dark' ? 'rgba(24,24,27,0.85)' : 'rgba(244,244,245,0.85)',
  color: theme === 'dark' ? '#a1a1aa' : '#52525b',
});

export const RegionLabelRow = ({
  label,
  theme,
}: {
  label: string;
  theme: 'light' | 'dark';
}) => (
  <div style={regionLabelOverlayStyle}>
    <span style={regionLabelBadgeStyle(theme)}>{label}</span>
  </div>
);

export const regionWrapStyle = (
  kind: RegionKind,
  theme: 'light' | 'dark',
  showLabels: boolean,
  intrinsicHeight?: boolean,
): CSSProperties => {
  // All region wrappers are flex columns so a root stack child with
  // `flex: 1` stretches consistently within its section. Region wrappers
  // do NOT apply internal padding — root stacks render edge-to-edge by
  // default and authors control insets via the stack's `Padding` field.
  // When `showLabels` is true, labels are overlaid (see `RegionLabelRow`) so
  // canvas preview layout matches flow preview.
  const baseFlex: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  if (intrinsicHeight && kind === 'body') {
    if (!showLabels) {
      return { ...baseFlex, flexShrink: 0, width: '100%', overflow: 'visible' };
    }
    const dashed = `1px dashed ${theme === 'dark' ? '#3f3f46' : '#d4d4d8'}`;
    return {
      ...baseFlex,
      position: 'relative',
      flexShrink: 0,
      width: '100%',
      borderTop: dashed,
      borderBottom: dashed,
      overflow: 'visible',
    };
  }

  if (!showLabels) {
    return kind === 'body'
      ? { ...baseFlex, flex: 1, minHeight: 0, overflowY: 'auto' }
      : { ...baseFlex, flexShrink: 0 };
  }
  const dashed = `1px dashed ${theme === 'dark' ? '#3f3f46' : '#d4d4d8'}`;
  if (kind === 'body') {
    return {
      ...baseFlex,
      position: 'relative',
      flex: 1,
      minHeight: 0,
      borderTop: dashed,
      borderBottom: dashed,
      // Scroll lives on the inner element in `BodyRegion`; avoid nested overflow here
      // so percentage / Fill height chains stay bounded.
      overflow: 'hidden',
    };
  }
  return {
    ...baseFlex,
    position: 'relative',
    flexShrink: 0,
  };
};

/**
 * Body region: keeps a wrapping <div> for the dashed/labelled chrome plus
 * an inner scrollable element so we can detect overflow without cropping
 * the chrome.
 */
export const BodyRegion = ({
  bodyLayer,
  ctx,
  theme,
  showLabels,
  intrinsicHeight,
  LayerView,
}: {
  bodyLayer: StackLayer;
  ctx: Ctx;
  theme: 'light' | 'dark';
  showLabels: boolean;
  intrinsicHeight?: boolean;
  LayerView: LayerViewComponent;
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scroll, setScroll] = useState({ top: false, bottom: false });

  useEffect(() => {
    if (intrinsicHeight) return;
    const el = scrollRef.current;
    if (!el) return;
    const recompute = () => {
      const top = el.scrollTop > 4;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
      setScroll((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };
    recompute();
    el.addEventListener('scroll', recompute, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(recompute) : null;
    if (ro) ro.observe(el);
    return () => {
      el.removeEventListener('scroll', recompute);
      if (ro) ro.disconnect();
    };
  }, [bodyLayer, intrinsicHeight]);

  const fadeColor = theme === 'dark' ? '10,10,10' : '255,255,255';

  const scrollChromeStyle: CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    ...(intrinsicHeight ? { flexShrink: 0 } : { flex: 1, minHeight: 0 }),
  };

  return (
    <div style={regionWrapStyle('body', theme, showLabels, intrinsicHeight)}>
      {showLabels && <RegionLabelRow label="Body" theme={theme} />}
      <div style={scrollChromeStyle}>
        <div
          ref={scrollRef}
          style={
            intrinsicHeight
              ? {
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }
              : {
                  flex: 1,
                  minHeight: 0,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                }
          }
        >
          <LayerView layer={bodyLayer} ctx={{ ...ctx, isRegionRoot: true, regionKind: 'body' }} />
        </div>
        {showLabels && !intrinsicHeight && scroll.top && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 18,
              pointerEvents: 'none',
              background: `linear-gradient(to bottom, rgba(${fadeColor},0.85), rgba(${fadeColor},0))`,
              zIndex: 1,
            }}
          />
        )}
        {showLabels && !intrinsicHeight && scroll.bottom && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 18,
              pointerEvents: 'none',
              background: `linear-gradient(to top, rgba(${fadeColor},0.85), rgba(${fadeColor},0))`,
              zIndex: 1,
            }}
          />
        )}
      </div>
    </div>
  );
};