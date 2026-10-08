import type { ReactNode } from 'react';
import {
  previewPhoneSafeAreaInsetBottomPx,
  previewPhoneSafeAreaInsetHorizontalPx,
  previewPhoneSafeAreaInsetTopPx,
  type PreviewPhoneSystemUi,
} from '@getrheo/flow-runtime/responsive/previewSafeAreaInsets';

export type PhoneSystemUi = PreviewPhoneSystemUi;

export {
  previewPhoneSafeAreaInsetTopPx,
  previewPhoneSafeAreaInsetBottomPx,
  previewPhoneSafeAreaInsetHorizontalPx,
};

export type PhoneFrameProps = {
  children: ReactNode;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  scale?: number;
  className?: string;
  /** 8px selection ring via outline (outside border box — preview size unchanged). Ignored when `showBezel` is false. */
  selected?: boolean;
  /** Renders outer device border + shadow. Turn off where the canvas already frames the preview (builder). */
  showBezel?: boolean;
  /** Status bar + navigation affordances match the selected mobile OS. */
  systemUi?: PhoneSystemUi;
  /** Desktop presets hide the phone status bar and home affordance. */
  showSystemChrome?: boolean;
};

const fontStackIos = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif';
const fontStackAndroid = 'Roboto, "Noto Sans", "Helvetica Neue", sans-serif';

/** Trailing icons scale with frame width; viewBoxes are 14–15px tall for vertical centering. */
const IosStatusTrailing = ({ ink, h }: { ink: string; h: number }) => (
  <svg
    height={h}
    viewBox="0 0 60 14"
    fill="none"
    aria-hidden
    style={{ flexShrink: 0, width: (60 / 14) * h }}
  >
    {/* Cellular — iOS: four bars, shared baseline, rounded caps */}
    <g fill={ink}>
      <rect x="0" y="9" width="3" height="5" rx="1" />
      <rect x="4.5" y="7" width="3" height="7" rx="1" />
      <rect x="9" y="5" width="3" height="9" rx="1" />
      <rect x="13.5" y="2.5" width="3" height="11.5" rx="1" />
    </g>
    {/* Wi‑Fi — nested arcs opening upward */}
    <path
      d="M23.5 11c1.6-1.6 3.8-1.6 5.4 0M22 9c2.5-2.5 6-2.5 8.5 0M20.5 7c3.3-3.3 7.9-3.3 11.2 0"
      stroke={ink}
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Battery — outline + fill cap (iOS nub on right) */}
    <rect x="36" y="3.5" width="21" height="7" rx="2" stroke={ink} strokeWidth="1.1" fill="none" />
    <rect x="37.8" y="5.2" width="14" height="3.6" rx="0.65" fill={ink} opacity="0.92" />
    <rect x="57.5" y="5.4" width="1.6" height="3.2" rx="0.45" fill={ink} />
  </svg>
);

const AndroidStatusTrailing = ({ ink, h }: { ink: string; h: number }) => (
  <svg
    height={h}
    viewBox="0 0 58 14"
    fill="none"
    aria-hidden
    style={{ flexShrink: 0, width: (58 / 14) * h }}
  >
    {/* Cellular — Material/Pixel-style filled bars */}
    <g fill={ink}>
      <rect x="0.5" y="9" width="2.8" height="5" rx="0.65" />
      <rect x="4.8" y="7.2" width="2.8" height="6.8" rx="0.65" />
      <rect x="9.1" y="5.2" width="2.8" height="8.8" rx="0.65" />
      <rect x="13.4" y="2.8" width="2.8" height="11.2" rx="0.65" />
    </g>
    {/* Wi‑Fi — three arcs, tighter than iOS */}
    <path
      d="M21.5 11.5c1.9-1.8 4.5-1.8 6.4 0M23 9.6c1.25-1.15 2.9-1.15 4.15 0M24.5 7.8c0.6-0.55 1.4-0.55 2 0"
      stroke={ink}
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
    />
    {/* Battery — squarer corner radius than iOS */}
    <rect x="33.5" y="2.8" width="22" height="8.4" rx="1.35" stroke={ink} strokeWidth="1.05" fill="none" />
    <rect x="35.3" y="4.6" width="15" height="4.8" rx="0.5" fill={ink} opacity="0.88" />
  </svg>
);

const StatusBarRow = ({
  systemUi,
  width,
  isDark,
}: {
  systemUi: PhoneSystemUi;
  width: number;
  isDark: boolean;
}) => {
  const ink = isDark ? '#f4f4f5' : '#18181b';
  const padX = Math.max(16, Math.round(width * 0.042));
  const padY = Math.max(5, Math.round(width * 0.012));
  const timeSize = Math.min(15.5, Math.max(12.5, Math.round(width * 0.036)));
  const statusH = Math.max(23, Math.round(width * 0.058));
  const clusterH = Math.min(15, Math.max(11.5, Math.round(statusH * 0.52)));

  return (
    <div
      style={{
        minHeight: statusH,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: padX,
        paddingRight: padX + (systemUi === 'ios' ? 0 : 1),
        paddingTop: padY,
        paddingBottom: padY,
        boxSizing: 'border-box',
        fontFamily: systemUi === 'ios' ? fontStackIos : fontStackAndroid,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <span
        style={{
          fontSize: timeSize,
          lineHeight: 1,
          color: ink,
          fontWeight: systemUi === 'ios' ? 600 : 500,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: systemUi === 'ios' ? '-0.02em' : '0.01em',
          /** Align cap height with the icon cluster */
          transform: systemUi === 'ios' ? 'translateY(0.5px)' : 'translateY(0px)',
        }}
      >
        9:41
      </span>
      {systemUi === 'ios' ? (
        <IosStatusTrailing ink={ink} h={clusterH} />
      ) : (
        <AndroidStatusTrailing ink={ink} h={clusterH} />
      )}
    </div>
  );
};

const HomeAffordance = ({
  systemUi,
  width,
  fill,
}: {
  systemUi: PhoneSystemUi;
  width: number;
  fill: string;
}) =>
  systemUi === 'ios' ? (
    <div
      style={{
        height: 5,
        width: Math.round(width * 0.35),
        maxWidth: 160,
        margin: '0 auto',
        background: fill,
        borderRadius: 2.5,
      }}
    />
  ) : (
    <div
      style={{
        height: 4,
        width: Math.round(width * 0.22),
        maxWidth: 120,
        margin: '0 auto',
        background: fill,
        borderRadius: 2,
        opacity: 0.92,
      }}
    />
  );

export const PhoneFrame = ({
  children,
  width = 280,
  height = 560,
  theme = 'dark',
  scale = 1,
  className,
  selected = false,
  showBezel = true,
  systemUi = 'ios',
  showSystemChrome = true,
}: PhoneFrameProps) => {
  const isDark = theme === 'dark';
  /** Keeps bezel 1px so inner layout matches unselected; selection emphasis is outline-only. */
  const frameBorder =
    showBezel ? `1px solid ${isDark ? '#27272a' : '#e4e4e7'}` : 'none';
  const showSelectionOutline = selected && showBezel;
  const primaryFill = `var(--color-primary, ${isDark ? '#a78bfa' : '#7c3aed'})`;
  const outerRadius = showSystemChrome ? (systemUi === 'ios' ? 48 : 40) : 12;
  const statusChromePadX = Math.max(6, Math.round(width * 0.014));
  const statusChromePadY = Math.max(6, Math.round(width * 0.016));

  return (
    <div
      className={className}
      style={{
        width: width * scale,
        height: height * scale,
        background: isDark ? '#0a0a0a' : '#ffffff',
        color: isDark ? '#fafafa' : '#0a0a0a',
        borderRadius: outerRadius,
        border: frameBorder,
        boxShadow:
          !showBezel
            ? 'none'
            : isDark
              ? '0 0 0 1px rgba(255,255,255,0.05) inset, 0 20px 40px -10px rgba(0,0,0,0.6)'
              : '0 10px 30px -10px rgba(0,0,0,0.2)',
        ...(showSelectionOutline
          ? {
              outlineWidth: 8,
              outlineStyle: 'solid',
              outlineColor: primaryFill,
              outlineOffset: 6,
            }
          : {
              outlineWidth: 0,
              outlineStyle: 'none',
              outlineOffset: 0,
            }),
        padding: 0,
        position: 'relative',
        overflow: showSelectionOutline ? 'visible' : 'hidden',
        boxSizing: 'border-box',
        fontFamily: systemUi === 'ios' ? fontStackIos : fontStackAndroid,
      }}
    >
      {/*
        Full-bleed app surface (matches real device: content extends under status bar /
        home indicator; chrome is overlaid). Avoids inset “padding” between screen fill
        and the frame when the screen layer has no margin/padding.
      */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: Math.max(0, outerRadius - 1),
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      {showSystemChrome ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            pointerEvents: 'none',
            paddingTop: statusChromePadY,
            paddingBottom: Math.max(4, Math.round(width * 0.01)),
            paddingLeft: statusChromePadX,
            paddingRight: statusChromePadX,
            boxSizing: 'border-box',
          }}
        >
          <StatusBarRow systemUi={systemUi} width={width} isDark={isDark} />
        </div>
      ) : null}
      {showSystemChrome ? (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: systemUi === 'ios' ? 8 : 10,
          }}
        >
          <HomeAffordance
            systemUi={systemUi}
            width={width}
            fill={isDark ? '#3f3f46' : '#a1a1aa'}
          />
        </div>
      ) : null}
    </div>
  );
};
