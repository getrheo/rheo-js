import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LayerRenderer } from '@getrheo/renderer-web';
import { useRheoContext } from './client.js';
import { useFlow, type WebFlowTerminalInfo } from './useFlow.js';

export type FlowProps = {
  channelId: string;
  theme?: 'light' | 'dark';
  /** Host-owned escape hatch when manifest resolve fails. */
  fallback?: ReactNode;
  /** Viewport width for responsive merge. When omitted, the host element is measured. */
  previewWidthPx?: number;
  style?: CSSProperties;
  className?: string;
  onFlowCompleted?: (payload: WebFlowTerminalInfo) => void;
  onFlowAbandoned?: (payload: WebFlowTerminalInfo) => void;
};

export const Flow = ({
  channelId,
  theme = 'light',
  fallback = null,
  previewWidthPx,
  style,
  className,
  onFlowCompleted,
  onFlowAbandoned,
}: FlowProps) => {
  const { config } = useRheoContext();
  const hostRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | undefined>(undefined);
  const {
    loading,
    resolveFailed,
    retry,
    screen,
    manifest,
    respond,
    relayNativeButtonAction,
    branding,
    mediaMap,
    pendingExternalSurface,
    reportExternalSurfaceOutcome,
    interpolationContext,
    trackExternalLinkOpened,
  } = useFlow({
    channelId,
    onFlowCompleted,
    onFlowAbandoned,
  });

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
  }, [previewWidthPx, loading, screen?.id]);

  if (loading) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 240,
          ...style,
        }}
      >
        Loading…
      </div>
    );
  }

  if (resolveFailed) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className={className} style={{ padding: 24, ...style }}>
        <p>Could not load this flow.</p>
        <button type="button" onClick={retry}>
          Retry
        </button>
      </div>
    );
  }

  if (pendingExternalSurface && pendingExternalSurface.config.provider !== 'stripe') {
    return null;
  }

  if (pendingExternalSurface?.config.provider === 'stripe') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          minHeight: 240,
          ...style,
        }}
      >
        <p>Redirecting to checkout…</p>
        <button
          type="button"
          onClick={() =>
            reportExternalSurfaceOutcome(pendingExternalSurface.id, 'purchase_cancelled', {
              provider: 'stripe',
            })
          }
        >
          Cancel
        </button>
      </div>
    );
  }

  if (!manifest || !screen) {
    return (
      <div className={className} style={{ padding: 24, ...style }}>
        Flow complete
      </div>
    );
  }

  const width = previewWidthPx ?? measuredWidth;

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 240,
        position: 'relative',
        ...style,
      }}
    >
      <LayerRenderer
        manifest={manifest}
        screen={screen}
        locale={config.locale ?? 'en'}
        mediaMap={mediaMap}
        branding={branding ?? undefined}
        mode="interactive"
        onRespond={respond}
        onAction={relayNativeButtonAction}
        onExternalLink={trackExternalLinkOpened}
        theme={theme}
        motionResetKey={screen.id}
        previewWidthPx={width}
        simulateSafeArea={false}
        interpolationContext={interpolationContext}
        authoringPreview={false}
      />
    </div>
  );
};
