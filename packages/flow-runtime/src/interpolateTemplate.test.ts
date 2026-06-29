import { describe, expect, it } from 'vitest';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import { MANIFEST_SCHEMA_VERSION } from '@getrheo/contracts/manifest';
import type { StepResponse } from './stateMachine';
import {
  extractLiquidTemplateBodies,
  interpolateTemplateString,
  resolveAndInterpolateLocalizedText,
} from './interpolateTemplate';

const manifestTyped = {
  flowId: '00000000-0000-0000-0000-000000000099',
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  version: 1,
  defaultLocale: 'en',
  locales: ['en', 'es'],
  entryScreenId: 'scr_a',
  screens: [
    {
      id: 'scr_a',
      name: 'Pick',
      regions: {
        body: {
          id: 'lyr_stack',
          kind: 'stack' as const,
          direction: 'vertical' as const,
          children: [
            {
              id: 'lyr_goal',
              kind: 'single_choice' as const,
              fieldKey: 'goal',
              children: [
                {
                  id: 'lyr_goal_opt_a',
                  kind: 'stack' as const,
                  direction: 'horizontal' as const,
                  align: 'center' as const,
                  gap: 8,
                  children: [
                    {
                      id: 'lyr_goal_opt_a_text',
                      kind: 'text' as const,
                      text: { default: 'Run faster', translations: { es: 'Correr más rápido' } },
                    },
                  ],
                },
                {
                  id: 'lyr_goal_opt_b',
                  kind: 'stack' as const,
                  direction: 'horizontal' as const,
                  align: 'center' as const,
                  gap: 8,
                  children: [
                    { id: 'lyr_goal_opt_b_text', kind: 'text' as const, text: { default: 'Lift more' } },
                  ],
                },
              ],
              optionBindings: [
                { optionId: 'opt_a', rootLayerId: 'lyr_goal_opt_a' },
                { optionId: 'opt_b', rootLayerId: 'lyr_goal_opt_b' },
              ],
              branching: { enabled: false, conditions: [] },
            },
          ],
        },
      },
      next: { default: 'scr_b' },
    },
    {
      id: 'scr_b',
      name: 'Name',
      regions: {
        body: {
          id: 'lyr_s2',
          kind: 'stack' as const,
          direction: 'vertical' as const,
          children: [
            {
              id: 'lyr_name',
              kind: 'text_input' as const,
              fieldKey: 'first_name',
              inputType: 'plain' as const,
              classification: 'safe' as const,
              placeholder: { default: 'Name' },
            },
          ],
        },
      },
      next: { default: null },
    },
  ],
} as FlowManifest;

const ctxBase = {
  manifest: manifestTyped,
  locale: 'en',
  responses: {} as Record<string, StepResponse>,
  customProperties: {} as Record<string, string>,
};

describe('extractLiquidTemplateBodies', () => {
  it('collects inner bodies', () => {
    expect(extractLiquidTemplateBodies('Hi {{ a }} there')).toEqual([' a ']);
  });

  it('returns empty when no tokens', () => {
    expect(extractLiquidTemplateBodies('plain')).toEqual([]);
  });
});

describe('interpolateTemplateString', () => {
  it('substitutes text response', () => {
    const s = interpolateTemplateString('Hello {{ first_name }}', {
      ...ctxBase,
      responses: { first_name: { kind: 'text', value: 'Ada', classification: 'safe' } },
    });
    expect(s).toBe('Hello Ada');
  });

  it('substitutes scale as string', () => {
    const m = structuredClone(manifestTyped) as FlowManifest;
    m.screens[0]!.regions.body.children[0] = {
      id: 'lyr_sc',
      kind: 'scale_input',
      fieldKey: 'score',
      min: 1,
      max: 5,
    };
    const s = interpolateTemplateString('{{ score }}', {
      ...ctxBase,
      manifest: m,
      responses: { score: { kind: 'scale', value: 4 } },
    });
    expect(s).toBe('4');
  });

  it('uses choice label by default', () => {
    const s = interpolateTemplateString('Goal: {{ goal }}', {
      ...ctxBase,
      responses: { goal: { kind: 'choice', choiceId: 'opt_a' } },
    });
    expect(s).toBe('Goal: Run faster');
  });

  it('uses translated choice label', () => {
    const s = interpolateTemplateString('{{ goal }}', {
      ...ctxBase,
      locale: 'es',
      responses: { goal: { kind: 'choice', choiceId: 'opt_a' } },
    });
    expect(s).toBe('Correr más rápido');
  });

  it('uses choice id with .id suffix', () => {
    const s = interpolateTemplateString('{{ goal.id }}', {
      ...ctxBase,
      responses: { goal: { kind: 'choice', choiceId: 'opt_a' } },
    });
    expect(s).toBe('opt_a');
  });

  it('joins multi choice labels', () => {
    const m = structuredClone(manifestTyped) as FlowManifest;
    m.screens[0]!.regions.body.children[0] = {
      id: 'lyr_goal',
      kind: 'multiple_choice',
      fieldKey: 'goal',
      children: [
        {
          id: 'lyr_goal_opt_a',
          kind: 'stack',
          direction: 'horizontal',
          align: 'center',
          gap: 8,
          children: [
            {
              id: 'lyr_goal_opt_a_text',
              kind: 'text',
              text: { default: 'Run faster', translations: { es: 'Correr más rápido' } },
            },
          ],
        },
        {
          id: 'lyr_goal_opt_b',
          kind: 'stack',
          direction: 'horizontal',
          align: 'center',
          gap: 8,
          children: [
            { id: 'lyr_goal_opt_b_text', kind: 'text', text: { default: 'Lift more' } },
          ],
        },
      ],
      optionBindings: [
        { optionId: 'opt_a', rootLayerId: 'lyr_goal_opt_a' },
        { optionId: 'opt_b', rootLayerId: 'lyr_goal_opt_b' },
      ],
      branching: { enabled: false, conditions: [] },
    };
    const s = interpolateTemplateString('{{ goal }}', {
      ...ctxBase,
      manifest: m,
      responses: { goal: { kind: 'multiChoice', choiceIds: ['opt_a', 'opt_b'] } },
    });
    expect(s).toBe('Run faster, Lift more');
  });

  it('joins multi choice ids', () => {
    const m = structuredClone(manifestTyped) as FlowManifest;
    m.screens[0]!.regions.body.children[0] = {
      id: 'lyr_goal',
      kind: 'multiple_choice',
      fieldKey: 'goal',
      children: [
        {
          id: 'lyr_goal_opt_a',
          kind: 'stack',
          direction: 'horizontal',
          align: 'center',
          gap: 8,
          children: [
            {
              id: 'lyr_goal_opt_a_text',
              kind: 'text',
              text: { default: 'Run faster', translations: { es: 'Correr más rápido' } },
            },
          ],
        },
        {
          id: 'lyr_goal_opt_b',
          kind: 'stack',
          direction: 'horizontal',
          align: 'center',
          gap: 8,
          children: [
            { id: 'lyr_goal_opt_b_text', kind: 'text', text: { default: 'Lift more' } },
          ],
        },
      ],
      optionBindings: [
        { optionId: 'opt_a', rootLayerId: 'lyr_goal_opt_a' },
        { optionId: 'opt_b', rootLayerId: 'lyr_goal_opt_b' },
      ],
      branching: { enabled: false, conditions: [] },
    };
    const s = interpolateTemplateString('{{ goal.id }}', {
      ...ctxBase,
      manifest: m,
      responses: { goal: { kind: 'multiChoice', choiceIds: ['opt_a', 'opt_b'] } },
    });
    expect(s).toBe('opt_a, opt_b');
  });

  it('reads custom.* from customProperties', () => {
    const s = interpolateTemplateString('Plan {{ custom.plan }}', {
      ...ctxBase,
      customProperties: { plan: 'pro' },
    });
    expect(s).toBe('Plan pro');
  });

  it('applies liquid default when missing', () => {
    const s = interpolateTemplateString('{{ custom.plan | default: free }}', {
      ...ctxBase,
      customProperties: {},
    });
    expect(s).toBe('free');
  });

  it('applies quoted default with spaces', () => {
    const s = interpolateTemplateString('{{ custom.plan | default: "Free tier" }}', ctxBase);
    expect(s).toBe('Free tier');
  });

  it('allows spaces inside token', () => {
    const s = interpolateTemplateString('{{  first_name  }}', {
      ...ctxBase,
      responses: { first_name: { kind: 'text', value: 'x', classification: 'safe' } },
    });
    expect(s).toBe('x');
  });

  it('returns empty for invalid expression', () => {
    const s = interpolateTemplateString('{{ not valid }}', ctxBase);
    expect(s).toBe('');
  });

  it('resolveAndInterpolateLocalizedText runs locale then tokens', () => {
    const s = resolveAndInterpolateLocalizedText(
      { default: 'Hola {{ goal }}', translations: { es: 'Hola {{ goal }}' } },
      {
        ...ctxBase,
        locale: 'es',
        responses: { goal: { kind: 'choice', choiceId: 'opt_a' } },
      },
    );
    expect(s).toBe('Hola Correr más rápido');
  });
});
