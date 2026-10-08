import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LayerRenderer } from '@getrheo/renderer-web';
import { useRheoContext } from './client.js';
import { useBanner } from './useBanner.js';

export type BannerProps = {
  channelId: string;
  theme?: 'light' | 'dark';
  fallback?: ReactNode;
  previewWidthPx?: number;
  style?: CSSProperties;
  className?: string;
};

export const RheoBanner = ({
  channelId,
  theme = 'light',
  fallback = null,
  previewWidthPx,
  style,
  className,
}: BannerProps) => {
  const { config } = useRheoContext();
  const hostRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | undefined>(undefined);
  const { loading, banner, dismissed, dismiss } = useBanner({ channelId });

  useEffect(() => {
    if (previewWidthPx != null) return;
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setMeasuredWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [previewWidthPx]);

  if (loading) return null;
  if (!banner || banner.control || dismissed) return null;

  const sizing = banner.manifest.sizing;
  const availableWidth =
    previewWidthPx ??
    measuredWidth ??
    (sizing.mode === 'fixed' ? sizing.width : 320);

  const boxStyle: CSSProperties =
    sizing.mode === 'fixed'
      ? {
          width: sizing.width,
          height: sizing.height,
          overflow: 'hidden',
          ...style,
        }
      : {
          width: '100%',
          maxWidth: sizing.maxWidth ?? undefined,
          minHeight: sizing.minHeight ?? undefined,
          maxHeight: sizing.maxHeight ?? undefined,
          display: 'flex',
          flexDirection: 'column',
          ...style,
        };

  const previewWidth =
    sizing.mode === 'responsive'
      ? Math.min(
          availableWidth,
          sizing.maxWidth ?? availableWidth,
        )
      : sizing.width;

  return (
    <div ref={hostRef} className={className} style={boxStyle}>
      <LayerRenderer
        manifest={banner.manifest as unknown as import('@getrheo/contracts').FlowManifest}
        screen={banner.manifest.rootScreen}
        locale={config.locale ?? banner.manifest.defaultLocale}
        mediaMap={banner.mediaMap}
        branding={banner.branding}
        mode="interactive"
        onAction={(action) => {
          if (action.kind === 'dismiss_banner') dismiss();
        }}
        theme={theme}
        motionResetKey={banner.manifest.rootScreen.id}
        previewWidthPx={previewWidth}
        simulateSafeArea={false}
        authoringPreview={false}
        intrinsicHeight={sizing.mode === 'responsive'}
      />
    </div>
  );
};

export const Banner = RheoBanner;
