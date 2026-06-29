import { describe, expect, it } from 'vitest';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { DecisionExpr, DecisionNode } from '@getrheo/contracts/decisions';
import { MANIFEST_SCHEMA_VERSION } from '@getrheo/contracts/manifest';
import {
  decisionExpressionUsesAttributionContext,
  entryDefaultNextIsAttributionDecision,
  getEntryScreenDefaultJumpTarget,
  manifestUsesAttributionInDecisions,
  sdkKeyUsesAttributionContext,
} from './builderHints';

const dec = (id: string, expression: DecisionExpr): DecisionNode => ({
  id,
  cases: [{ id: `${id}_case_0`, name: 'Group 1', expression, next: 'scr_a' }],
  elseNext: 'scr_a',
});

describe('sdkKeyUsesAttributionContext', () => {
  it('detects reserved prefixes', () => {
    expect(sdkKeyUsesAttributionContext('acquisition.source')).toBe(true);
    expect(sdkKeyUsesAttributionContext('link.entry')).toBe(true);
    expect(sdkKeyUsesAttributionContext('attribution.isOrganic')).toBe(true);
    expect(sdkKeyUsesAttributionContext('custom.foo')).toBe(false);
  });
});

describe('entryDefaultNextIsAttributionDecision', () => {
  it('is true when entry default next is a decision using acquisition keys', () => {
    const expression: DecisionExpr = {
      kind: 'predicate',
      variable: { kind: 'sdk', key: 'acquisition.source' },
      predicate: { type: 'string', pred: { op: 'eq', value: 'meta' } },
    };
    const manifest = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      defaultLocale: 'en',
      entryScreenId: 'scr_entry',
      screens: [
        {
          id: 'scr_entry',
          name: 'Entry',
          regions: { body: { id: 'st', kind: 'stack', children: [] } },
          next: { default: 'dec_split' },
          containerStyleBreakpoints: {},
        },
      ],
      decisionNodes: [dec('dec_split', expression)],
    } as unknown as FlowManifest;
    expect(getEntryScreenDefaultJumpTarget(manifest)).toBe('dec_split');
    expect(entryDefaultNextIsAttributionDecision(manifest)).toBe(true);
  });

  it('is false when entry jumps to a decision without attribution keys', () => {
    const expression: DecisionExpr = {
      kind: 'predicate',
      variable: { kind: 'builtin', name: 'locale' },
      predicate: { type: 'string', pred: { op: 'eq', value: 'en' } },
    };
    const manifest = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      defaultLocale: 'en',
      entryScreenId: 'scr_entry',
      screens: [
        {
          id: 'scr_entry',
          name: 'Entry',
          regions: { body: { id: 'st', kind: 'stack', children: [] } },
          next: { default: 'dec_split' },
          containerStyleBreakpoints: {},
        },
      ],
      decisionNodes: [dec('dec_split', expression)],
    } as unknown as FlowManifest;
    expect(entryDefaultNextIsAttributionDecision(manifest)).toBe(false);
  });
});

describe('manifestUsesAttributionInDecisions', () => {
  it('detects any decision using link keys', () => {
    const expression: DecisionExpr = {
      kind: 'predicate',
      variable: { kind: 'sdk', key: 'link.entry' },
      predicate: { type: 'string', pred: { op: 'eq', value: 'x' } },
    };
    const manifest = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      defaultLocale: 'en',
      entryScreenId: 'scr_a',
      screens: [
        {
          id: 'scr_a',
          name: 'A',
          regions: { body: { id: 'st', kind: 'stack', children: [] } },
          next: { default: null },
          containerStyleBreakpoints: {},
        },
      ],
      decisionNodes: [dec('dec_x', expression)],
    } as unknown as FlowManifest;
    expect(manifestUsesAttributionInDecisions(manifest)).toBe(true);
  });
});

describe('decisionExpressionUsesAttributionContext', () => {
  it('walks nested groups', () => {
    const inner: DecisionExpr = {
      kind: 'predicate',
      variable: { kind: 'sdk', key: 'attribution.isOrganic' },
      predicate: { type: 'boolean', pred: { op: 'eq', value: true } },
    };
    const expr: DecisionExpr = { kind: 'group', op: 'and', children: [inner] };
    expect(decisionExpressionUsesAttributionContext(expr)).toBe(true);
  });
});
