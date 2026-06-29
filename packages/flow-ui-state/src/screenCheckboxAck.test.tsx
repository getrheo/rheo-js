import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Screen } from '@getrheo/contracts/screens';
import type { Layer, StackLayer } from '@getrheo/contracts/layers';
import {
  ScreenCheckboxAckProvider,
  computeCheckboxContinueBlocked,
  listBlockingCheckboxes,
} from './screenCheckboxAck';

const stack = (children: Layer[]): StackLayer => ({
  id: 'lyr_stack',
  kind: 'stack',
  direction: 'vertical',
  children,
});

const screenWith = (children: Layer[]): Screen => ({
  id: 'scr_1',
  name: 'S',
  regions: { body: stack(children) },
  next: { default: null },
});

describe('computeCheckboxContinueBlocked', () => {
  it('is false when no blocking checkboxes', () => {
    const s = screenWith([{ id: 'c1', kind: 'checkbox', fieldKey: 'a', blocking: false }]);
    expect(computeCheckboxContinueBlocked(s, {})).toBe(false);
  });

  it('is true when blocking checkbox unchecked', () => {
    const s = screenWith([{ id: 'c1', kind: 'checkbox', fieldKey: 'terms', blocking: true }]);
    expect(computeCheckboxContinueBlocked(s, { terms: false })).toBe(true);
    expect(computeCheckboxContinueBlocked(s, { terms: true })).toBe(false);
  });
});

describe('listBlockingCheckboxes', () => {
  it('returns only blocking checkbox layers', () => {
    const s = screenWith([
      { id: 'c1', kind: 'checkbox', fieldKey: 'a', blocking: false },
      { id: 'c2', kind: 'checkbox', fieldKey: 'b', blocking: true },
    ]);
    const list = listBlockingCheckboxes(s);
    expect(list.map((l) => l.fieldKey)).toEqual(['b']);
  });
});

describe('ScreenCheckboxAckProvider', () => {
  it('renders children', () => {
    const s = screenWith([{ id: 'c1', kind: 'checkbox', fieldKey: 'k', blocking: false }]);
    const html = renderToStaticMarkup(
      <ScreenCheckboxAckProvider screen={s}>
        <span data-testid="child">ok</span>
      </ScreenCheckboxAckProvider>,
    );
    expect(html).toContain('ok');
  });
});
