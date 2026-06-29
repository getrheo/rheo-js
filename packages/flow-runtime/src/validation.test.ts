import { describe, expect, it } from 'vitest';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import { validateManifest, validatePublishable } from './validation';
import type { FlowManifest } from '@getrheo/contracts';

describe('validateManifest', () => {
  it('returns ok for a valid manifest', () => {
    const result = validateManifest(validFlow());
    expect(result.ok).toBe(true);
  });

  it('returns issues for invalid manifest', () => {
    const result = validateManifest({ flowId: 'not-a-uuid' });
    expect(result.ok).toBe(false);
  });
});

describe('validatePublishable', () => {
  it('passes for valid manifest', () => {
    const result = validatePublishable(validFlow());
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('warns on unreachable screen without blocking publish', () => {
    const m: FlowManifest = validFlow();
    m.screens.push({
      id: 'scr_orphan',
      name: 'Orphan',
      regions: {
        body: {
          id: 'lyr_orphan_body',
          kind: 'stack',
          direction: 'vertical',
          children: [
            {
              id: 'lyr_orphan_text',
              kind: 'text',
              text: { default: 'Orphan' },
            },
          ],
        },
      },
      next: { default: null },
    });
    const result = validatePublishable(m);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.warnings.some((i) => i.code === 'screen.unreachable')).toBe(true);
  });

  it('flags no completion path', () => {
    const m: FlowManifest = {
      ...validFlow(),
      screens: [
        {
          id: 'scr_a',
          name: 'A',
          regions: {
            body: {
              id: 'lyr_a_body',
              kind: 'stack',
              direction: 'vertical',
              children: [{ id: 'lyr_a_text', kind: 'text', text: { default: 'A' } }],
            },
          },
          next: { default: 'scr_b' },
        },
        {
          id: 'scr_b',
          name: 'B',
          regions: {
            body: {
              id: 'lyr_b_body',
              kind: 'stack',
              direction: 'vertical',
              children: [{ id: 'lyr_b_text', kind: 'text', text: { default: 'B' } }],
            },
          },
          next: { default: 'scr_a' },
        },
      ],
      entryScreenId: 'scr_a',
    };
    const result = validatePublishable(m);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.code === 'flow.no_completion_path')).toBe(true);
    }
  });

  it('follows external surface (paywall) edges when checking completion path', () => {
    const m: FlowManifest = { ...validFlow() };
    const welcome = m.screens.find((s) => s.id === 'scr_welcome')!;
    welcome.next = { default: 'surf_paywall_test' };
    m.externalSurfaceNodes = [
      {
        id: 'surf_paywall_test',
        name: 'Paywall',
        config: { provider: 'revenuecat', offeringId: 'default' },
        outcomes: {},
        fallback: 'scr_exit_terminal',
      },
    ];
    m.screens.push({
      id: 'scr_exit_terminal',
      name: 'Done',
      regions: {
        body: {
          id: 'lyr_exit_body',
          kind: 'stack',
          direction: 'vertical',
          children: [{ id: 'lyr_exit_text', kind: 'text', text: { default: 'Bye' } }],
        },
      },
      next: { default: null },
    });
    const result = validatePublishable(m);
    expect(result.ok).toBe(true);
    expect(result.issues.some((i) => i.code === 'flow.no_completion_path')).toBe(false);
  });
});
