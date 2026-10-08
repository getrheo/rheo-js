import { useId, type ChangeEvent, type CSSProperties, type MouseEvent } from 'react';
import type { ResolvedScaleInputSliderStyle } from '@getrheo/flow-runtime/scaleInputStyle';
import { resolveWebTextFontFamilyCss } from '@getrheo/renderer-core';
import { omitUndefinedCssProps } from '../LayerRendererStyle';

export const scaleInputTextCss = (
  text: ResolvedScaleInputSliderStyle['label'],
): CSSProperties =>
  omitUndefinedCssProps({
    fontFamily: resolveWebTextFontFamilyCss(text.fontFamily),
    fontSize: text.fontSizePx,
    fontWeight: text.fontWeight,
    color: text.color,
    textAlign: text.textAlign,
    lineHeight: text.lineHeight,
    letterSpacing:
      text.letterSpacing !== undefined ? `${text.letterSpacing}em` : undefined,
    opacity: text.opacity,
  });

/** @deprecated Use {@link scaleInputTextCss}. */
export const scaleInputLabelCss = scaleInputTextCss;

type ScaleRangeControlProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  slider: ResolvedScaleInputSliderStyle;
  onChange: (next: number) => void;
  onClick?: (e: MouseEvent<HTMLInputElement>) => void;
  pointerEventsNone?: boolean;
};

export const ScaleRangeControl = ({
  value,
  min,
  max,
  step,
  disabled,
  slider,
  onChange,
  onClick,
  pointerEventsNone,
}: ScaleRangeControlProps) => {
  const uid = useId().replace(/:/g, '');
  const className = `rheo-scale-range-${uid}`;
  const span = max - min;
  const pct = span <= 0 ? 0 : ((value - min) / span) * 100;
  const { trackHeightPx, trackColor, fillColor, thumbSizePx, thumbColor } = slider;
  const thumbOffset = (trackHeightPx - thumbSizePx) / 2;
  const trackRadius = Math.max(1, trackHeightPx / 2);

  return (
    <>
      <style>{`
        .${className} {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: ${thumbSizePx}px;
          margin: 0;
          padding: 0;
          background: transparent;
          cursor: pointer;
        }
        .${className}:disabled {
          cursor: default;
        }
        .${className}::-webkit-slider-runnable-track {
          height: ${trackHeightPx}px;
          border-radius: ${trackRadius}px;
          background: linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${pct}%, ${trackColor} ${pct}%, ${trackColor} 100%);
        }
        .${className}::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: ${thumbSizePx}px;
          height: ${thumbSizePx}px;
          border-radius: 50%;
          background: ${thumbColor};
          border: none;
          margin-top: ${thumbOffset}px;
        }
        .${className}::-moz-range-track {
          height: ${trackHeightPx}px;
          border-radius: ${trackRadius}px;
          background: ${trackColor};
        }
        .${className}::-moz-range-progress {
          height: ${trackHeightPx}px;
          border-radius: ${trackRadius}px;
          background: ${fillColor};
        }
        .${className}::-moz-range-thumb {
          width: ${thumbSizePx}px;
          height: ${thumbSizePx}px;
          border-radius: 50%;
          background: ${thumbColor};
          border: none;
        }
      `}</style>
      <input
        type="range"
        className={className}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={value}
        onClick={onClick}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(n);
        }}
        style={{
          width: '100%',
          ...(pointerEventsNone ? { pointerEvents: 'none' as const } : {}),
        }}
      />
    </>
  );
};
