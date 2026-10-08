import { DEFAULT_THEMED_FOREGROUND, PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';

export const bodyStack = (
  id: string,
  children: Array<Record<string, unknown>>,
  extra?: Record<string, unknown>,
): Record<string, unknown> => ({
  id,
  kind: 'stack',
  direction: 'vertical',
  gap: 12,
  style: {
    width: 'full',
    height: 'fill',
    padding: { t: 20, r: 20, b: 20, l: 20 },
  },
  children,
  ...extra,
});

export const asBody = (stack: Record<string, unknown>): Screen['regions']['body'] =>
  stack as Screen['regions']['body'];

export const tx = (id: string, copy: string, style?: Record<string, unknown>): Record<string, unknown> => ({
  id,
  kind: 'text',
  text: { default: copy },
  style: {
    width: 'auto',
    height: 'auto',
    color: DEFAULT_THEMED_FOREGROUND,
    ...(style ?? {}),
  },
});

export const cta = (id: string, label = 'Continue'): Record<string, unknown> => ({
  id,
  kind: 'button',
  variant: 'primary',
  action: { kind: 'continue' },
  direction: 'horizontal',
  align: 'center',
  distribution: 'center',
  style: { width: 'full', height: 'auto' },
  children: [
    {
      id: `${id}_t`,
      kind: 'text',
      text: { default: label },
      style: { width: 'auto', height: 'auto', color: PRIMARY_FILLED_LABEL },
    },
  ],
});

/** On-screen QA brief: title + what to test + expected outcome. */
export const qaBrief = (
  prefix: string,
  opts: { title: string; test: string; expected: string },
): Array<Record<string, unknown>> => [
  tx(`${prefix}_title`, opts.title, { fontSize: 20, fontWeight: 800 }),
  tx(`${prefix}_test_h`, 'TEST', {
    fontSize: 11,
    fontWeight: 700,
    color: { light: '#0369a1', dark: '#7dd3fc' },
  }),
  tx(`${prefix}_test`, opts.test, { fontSize: 13, lineHeight: 1.35 }),
  tx(`${prefix}_exp_h`, 'EXPECTED', {
    fontSize: 11,
    fontWeight: 700,
    color: { light: '#15803d', dark: '#86efac' },
  }),
  tx(`${prefix}_exp`, opts.expected, { fontSize: 13, lineHeight: 1.35 }),
];

export type ScreenDraft = Omit<Screen, 'next'>;

export const chainScreens = (screens: ScreenDraft[]): Screen[] =>
  screens.map((screen, index) => ({
    ...screen,
    next: { default: index < screens.length - 1 ? screens[index + 1]!.id : null },
  }));

export const choiceOption = (
  id: string,
  label: string,
  extraStyle?: Record<string, unknown>,
): Record<string, unknown> => ({
  id,
  kind: 'stack',
  direction: 'horizontal',
  align: 'center',
  gap: 8,
  style: {
    width: 'full',
    height: 'auto',
    padding: { t: 12, r: 14, b: 12, l: 14 },
    radius: 12,
    background: { light: '#f4f4f5', dark: '#27272a' },
    border: { width: 1, color: { light: '#e4e4e7', dark: '#3f3f46' } },
    ...extraStyle,
  },
  selectedStyle: {
    background: { light: '#e0e7ff', dark: '#312e81' },
    border: { width: 2, color: { light: '#6366f1', dark: '#818cf8' } },
  },
  children: [tx(`${id}_t`, label, { fontSize: 15, fontWeight: 600 })],
});
