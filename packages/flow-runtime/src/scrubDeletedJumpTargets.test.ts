import { describe, expect, it } from 'vitest';
import type { FlowManifest, Screen } from '@getrheo/contracts';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import { scrubDeletedJumpTargetsInPlace } from './scrubDeletedJumpTargets';
import { validateManifest } from './validation';

const screenWithGoTo = (id: string, goTo: string): Screen => ({
  id,
  name: id,
  next: { default: null },
  regions: {
    body: {
      id: `${id}_body`,
      kind: 'stack',
      direction: 'vertical',
      children: [
        {
          id: `${id}_btn`,
          kind: 'button',
          name: 'Go',
          variant: 'primary',
          action: { kind: 'go_to_step', screenId: goTo },
          children: [
            {
              id: `${id}_btn_label`,
              kind: 'text',
              text: { default: 'Go' },
              style: { color: { light: '#000000' } },
            },
          ],
        },
      ],
    },
  },
});

describe('scrubDeletedJumpTargetsInPlace', () => {
  it('clears button go_to_step and surface fallback pointing at a deleted screen', () => {
    const base = validFlow() as FlowManifest;
    const next: FlowManifest = {
      ...base,
      screens: [
        screenWithGoTo('scr_a', 'scr_gone'),
        ...(base.screens as Screen[]).filter((s) => s.id !== 'scr_a'),
      ] as never,
      externalSurfaceNodes: [
        {
          id: 'ext_paywall',
          name: 'Paywall',
          config: { provider: 'unspecified' },
          outcomes: {},
          fallback: 'scr_gone',
        },
      ],
    };

    scrubDeletedJumpTargetsInPlace(next, new Set(['scr_gone']));

    const btn = next.screens
      .find((s) => s.id === 'scr_a')
      ?.regions.body.children.find((c) => c.kind === 'button');
    expect(btn && btn.kind === 'button' ? btn.action : null).toEqual({ kind: 'continue' });
    expect(next.externalSurfaceNodes?.[0]?.fallback).toBeNull();
  });

  it('leaves a scrubbed draft schema-valid when only jump targets were broken', () => {
    const base = validFlow() as FlowManifest;
    const broken: FlowManifest = structuredClone({
      ...base,
      screens: base.screens.map((s) =>
        s.id === base.screens[0]!.id
          ? { ...s, next: { default: 'scr_missing' } }
          : s,
      ),
    });

    scrubDeletedJumpTargetsInPlace(broken, new Set(['scr_missing']));
    const result = validateManifest(broken);
    expect(result.ok).toBe(true);
  });
});
