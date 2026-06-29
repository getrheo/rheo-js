import { describe, expect, it } from 'vitest';
import {
  formatCounterAsTime,
  formatCounterLayerDisplay,
  formatCounterLayerValue,
  mergePartsForTimeFormat,
  resolveCounterAnimationDurationMs,
  splitSecondsForTimeFormat,
} from './counterLayer';

describe('formatCounterLayerValue', () => {
  it('uses integer rounding when decimalPlaces is 0', () => {
    expect(formatCounterLayerValue(3.7, 0)).toBe('4');
    expect(formatCounterLayerValue(10, 0)).toBe('10');
  });

  it('rounds to N fractional digits and trims trailing zeros', () => {
    expect(formatCounterLayerValue(3.14159, 2)).toBe('3.14');
    expect(formatCounterLayerValue(10, 2)).toBe('10');
    expect(formatCounterLayerValue(10.5, 2)).toBe('10.5');
  });

  it('defaults to 0 decimal places when omitted', () => {
    expect(formatCounterLayerValue(2.9)).toBe('3');
  });
});

describe('formatCounterAsTime', () => {
  it('formats mm_ss', () => {
    expect(formatCounterAsTime(0, 'mm_ss')).toBe('0:00');
    expect(formatCounterAsTime(59, 'mm_ss')).toBe('0:59');
    expect(formatCounterAsTime(60, 'mm_ss')).toBe('1:00');
    expect(formatCounterAsTime(125, 'mm_ss')).toBe('2:05');
  });

  it('formats hh_mm_ss', () => {
    expect(formatCounterAsTime(3661, 'hh_mm_ss')).toBe('1:01:01');
    expect(formatCounterAsTime(3600, 'hh_mm_ss')).toBe('1:00:00');
  });

  it('formats dd_hh_mm_ss', () => {
    expect(formatCounterAsTime(90061, 'dd_hh_mm_ss')).toBe('1:01:01:01');
  });

  it('clamps negative seconds to zero display', () => {
    expect(formatCounterAsTime(-5, 'mm_ss')).toBe('0:00');
  });
});

describe('formatCounterLayerDisplay', () => {
  it('routes to number or time', () => {
    expect(formatCounterLayerDisplay(90, { displayKind: 'number', decimalPlaces: 0 })).toBe('90');
    expect(formatCounterLayerDisplay(90, { displayKind: 'time', timeFormat: 'mm_ss' })).toBe(
      '1:30',
    );
  });

  it('defaults time format to mm_ss', () => {
    expect(formatCounterLayerDisplay(125, { displayKind: 'time' })).toBe('2:05');
  });
});

describe('splitSecondsForTimeFormat / mergePartsForTimeFormat', () => {
  const formats = ['mm_ss', 'hh_mm_ss', 'dd_hh_mm_ss'] as const;

  it.each(formats)('round-trips total seconds for %s', (fmt) => {
    const totals = [0, 59, 60, 3661, 90061];
    for (const t of totals) {
      const parts = splitSecondsForTimeFormat(t, fmt);
      expect(mergePartsForTimeFormat(parts, fmt)).toBe(t);
    }
  });

  it('clamps mm_ss seconds to 0–59 when merging', () => {
    expect(
      mergePartsForTimeFormat({ days: 0, hours: 0, minutes: 1, seconds: 99 }, 'mm_ss'),
    ).toBe(119);
  });

  it('clamps hh_mm_ss minutes and seconds', () => {
    expect(
      mergePartsForTimeFormat({ days: 0, hours: 1, minutes: 99, seconds: 99 }, 'hh_mm_ss'),
    ).toBe(3600 + 59 * 60 + 59);
  });

  it('clamps dd_hh_mm_ss hours to 0–23 and minutes/seconds to 59', () => {
    expect(
      mergePartsForTimeFormat({ days: 1, hours: 25, minutes: 70, seconds: 70 }, 'dd_hh_mm_ss'),
    ).toBe(86400 + 23 * 3600 + 59 * 60 + 59);
  });
});

describe('resolveCounterAnimationDurationMs', () => {
  it('uses absolute second delta × 1000 for time mode', () => {
    expect(
      resolveCounterAnimationDurationMs({
        displayKind: 'time',
        startValue: 20,
        endValue: 0,
      }),
    ).toBe(20_000);
    expect(
      resolveCounterAnimationDurationMs({
        displayKind: 'time',
        startValue: 0,
        endValue: 15,
      }),
    ).toBe(15_000);
  });

  it('uses durationMs (default 3000) for number mode', () => {
    expect(
      resolveCounterAnimationDurationMs({
        displayKind: 'number',
        durationMs: 500,
        startValue: 0,
        endValue: 100,
      }),
    ).toBe(500);
    expect(
      resolveCounterAnimationDurationMs({
        displayKind: 'number',
        startValue: 0,
        endValue: 100,
      }),
    ).toBe(3000);
  });
});
