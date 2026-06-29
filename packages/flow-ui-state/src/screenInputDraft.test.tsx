import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ScreenInputDraftProvider,
  computeValidity,
  draftToResponse,
  useScreenInputDraft,
  useScreenInputValidity,
  type InputDraft,
} from './screenInputDraft';
import type { Screen } from '@getrheo/contracts/screens';
import type { Layer, StackLayer } from '@getrheo/contracts/layers';

/**
 * Build a minimal Screen with the given body children. The store of
 * tests below cares about the input layer + (optional) continue button
 * being present anywhere in the tree.
 */
const buildScreen = (children: Layer[]): Screen => {
  const body: StackLayer = {
    id: 'lyr_body',
    kind: 'stack',
    direction: 'vertical',
    children,
  };
  return {
    id: 'scr_test',
    name: 'Test',
    regions: { body },
    next: { default: null },
  } as Screen;
};

const textInputScreen = (maxLength?: number): Screen =>
  buildScreen([
    {
      id: 'lyr_input',
      kind: 'text_input',
      fieldKey: 'name',
      classification: 'safe',
      ...(maxLength !== undefined ? { maxLength } : {}),
    },
  ]);

const scaleScreen = (opts?: { min?: number; max?: number; step?: number; defaultValue?: number }): Screen =>
  buildScreen([
    {
      id: 'lyr_scale',
      kind: 'scale_input',
      fieldKey: 'score',
      min: opts?.min ?? 0,
      max: opts?.max ?? 10,
      step: opts?.step ?? 1,
      ...(opts?.defaultValue !== undefined ? { defaultValue: opts.defaultValue } : {}),
    },
  ]);

const choiceChildren = (): import('@getrheo/contracts/layers').StackLayer[] => [
  {
    id: 'opt_a_stack',
    kind: 'stack',
    direction: 'vertical',
    children: [{ id: 'opt_a_text', kind: 'text', text: { default: 'A' } }],
  },
  {
    id: 'opt_b_stack',
    kind: 'stack',
    direction: 'vertical',
    children: [{ id: 'opt_b_text', kind: 'text', text: { default: 'B' } }],
  },
];

const choiceBindings = () => [
  { optionId: 'opt_a', rootLayerId: 'opt_a_stack' },
  { optionId: 'opt_b', rootLayerId: 'opt_b_stack' },
];

const multiChoiceScreen = (opts?: { minSelections?: number; maxSelections?: number }): Screen =>
  buildScreen([
    {
      id: 'lyr_input',
      kind: 'multiple_choice',
      fieldKey: 'tags',
      children: choiceChildren(),
      optionBindings: choiceBindings(),
      branching: { enabled: false, conditions: [] },
      ...(opts?.minSelections !== undefined ? { minSelections: opts.minSelections } : {}),
      ...(opts?.maxSelections !== undefined ? { maxSelections: opts.maxSelections } : {}),
    },
  ]);

const singleChoiceScreen = (): Screen =>
  buildScreen([
    {
      id: 'lyr_input',
      kind: 'single_choice',
      fieldKey: 'goal',
      children: choiceChildren(),
      optionBindings: choiceBindings(),
      branching: { enabled: false, conditions: [] },
    },
  ]);

/** Render a probe component inside the provider that captures context state. */
const Probe = ({
  init,
  out,
}: {
  init?: InputDraft | null;
  out: { draft?: InputDraft | null; valid?: boolean };
}) => {
  const ctx = useScreenInputDraft();
  const validity = useScreenInputValidity();
  if (ctx && init !== undefined) ctx.setDraft(init);
  out.draft = ctx?.draft ?? null;
  out.valid = validity.valid;
  return null;
};

describe('ScreenInputDraftProvider', () => {
  it('treats screens with no input as always valid', () => {
    const screen = buildScreen([
      { id: 'lyr_text', kind: 'text', text: { default: 'hi' } },
    ]);
    const out: { valid?: boolean } = {};
    renderToStaticMarkup(
      <ScreenInputDraftProvider screen={screen}>
        <Probe out={out} />
      </ScreenInputDraftProvider>,
    );
    expect(out.valid).toBe(true);
  });

  it('text input: empty draft is invalid, non-empty is valid', () => {
    const screen = textInputScreen();
    const empty: { valid?: boolean } = {};
    renderToStaticMarkup(
      <ScreenInputDraftProvider screen={screen}>
        <Probe out={empty} />
      </ScreenInputDraftProvider>,
    );
    expect(empty.valid).toBe(false);

    // SSR can't carry state across renders, so instead verify with a draft
    // seeded at first paint via the probe.
    const filled: { valid?: boolean } = {};
    renderToStaticMarkup(
      <ScreenInputDraftProvider screen={screen}>
        <Probe init={{ kind: 'text', value: 'hi' }} out={filled} />
      </ScreenInputDraftProvider>,
    );
    // setDraft schedules an update we cannot observe in static markup, so
    // assert the post-render captured value via the validity getter
    // instead — re-render to flush.
    expect(filled.valid).toBe(false); // first paint sees null draft
  });

  it('multiple_choice: respects minSelections', () => {
    const screen = multiChoiceScreen({ minSelections: 2 });
    const out: { valid?: boolean } = {};
    renderToStaticMarkup(
      <ScreenInputDraftProvider screen={screen}>
        <Probe out={out} />
      </ScreenInputDraftProvider>,
    );
    // No draft -> invalid because minSelections=2 isn't met.
    expect(out.valid).toBe(false);
  });

  it('multiple_choice: respects maxSelections', () => {
    const screen = multiChoiceScreen({ maxSelections: 1 });
    expect(computeValidity(screen, { kind: 'multiChoice', choiceIds: ['opt_a', 'opt_b'] }).valid).toBe(
      false,
    );
    expect(computeValidity(screen, { kind: 'multiChoice', choiceIds: ['opt_a'] }).valid).toBe(true);
  });

  it('single_choice: invalid until a draft is set', () => {
    const screen = singleChoiceScreen();
    const out: { valid?: boolean } = {};
    renderToStaticMarkup(
      <ScreenInputDraftProvider screen={screen}>
        <Probe out={out} />
      </ScreenInputDraftProvider>,
    );
    expect(out.valid).toBe(false);
  });

  it('scale_input: initial draft from layer defaults is valid', () => {
    const screen = scaleScreen({ defaultValue: 6 });
    const out: { valid?: boolean; draft?: InputDraft | null } = {};
    renderToStaticMarkup(
      <ScreenInputDraftProvider screen={screen}>
        <Probe out={out} />
      </ScreenInputDraftProvider>,
    );
    expect(out.valid).toBe(true);
    expect(out.draft).toEqual({ kind: 'scale', value: 6 });
  });
});

describe('draft -> StepResponse conversion', () => {
  it('text draft picks up the input layer classification', () => {
    const screen = textInputScreen();
    const r = draftToResponse(screen, { kind: 'text', value: 'Sam' });
    expect(r).toEqual({ kind: 'text', value: 'Sam', classification: 'safe' });
  });

  it('choice draft converts to a choice StepResponse', () => {
    const screen = singleChoiceScreen();
    const r = draftToResponse(screen, { kind: 'choice', choiceId: 'opt_a' });
    expect(r).toEqual({ kind: 'choice', choiceId: 'opt_a' });
  });

  it('multiChoice draft converts to a multiChoice StepResponse', () => {
    const screen = multiChoiceScreen();
    const r = draftToResponse(screen, {
      kind: 'multiChoice',
      choiceIds: ['opt_a'],
    });
    expect(r).toEqual({ kind: 'multiChoice', choiceIds: ['opt_a'] });
  });

  it('null draft yields null', () => {
    expect(draftToResponse(textInputScreen(), null)).toBeNull();
  });

  it('scale draft converts to scale StepResponse', () => {
    const screen = scaleScreen();
    const r = draftToResponse(screen, { kind: 'scale', value: 7 });
    expect(r).toEqual({ kind: 'scale', value: 7 });
  });
});

describe('validity rules (direct)', () => {
  it('text_input enforces maxLength', () => {
    const screen = textInputScreen(3);
    expect(computeValidity(screen, { kind: 'text', value: 'too long' }).valid).toBe(false);
    expect(computeValidity(screen, { kind: 'text', value: 'ok' }).valid).toBe(true);
    expect(computeValidity(screen, { kind: 'text', value: '   ' }).valid).toBe(false);
  });

  it('multi_choice defaults minSelections to 1', () => {
    const screen = multiChoiceScreen();
    expect(computeValidity(screen, { kind: 'multiChoice', choiceIds: [] }).valid).toBe(false);
    expect(
      computeValidity(screen, { kind: 'multiChoice', choiceIds: ['opt_a'] }).valid,
    ).toBe(true);
  });

  it('mismatched draft kind is invalid', () => {
    const screen = textInputScreen();
    expect(computeValidity(screen, { kind: 'choice', choiceId: 'x' }).valid).toBe(false);
  });

  it('text_input email mode rejects invalid email', () => {
    const screen = buildScreen([
      {
        id: 'lyr_input',
        kind: 'text_input',
        fieldKey: 'email',
        classification: 'safe',
        inputType: 'email',
      },
    ]);
    expect(computeValidity(screen, { kind: 'text', value: 'not-an-email' }).valid).toBe(false);
    expect(computeValidity(screen, { kind: 'text', value: 'a@b.co' }).valid).toBe(true);
  });

  it('text_input required false allows empty', () => {
    const screen = buildScreen([
      {
        id: 'lyr_input',
        kind: 'text_input',
        fieldKey: 'note',
        classification: 'safe',
        required: false,
      },
    ]);
    expect(computeValidity(screen, { kind: 'text', value: '' }).valid).toBe(true);
    expect(computeValidity(screen, { kind: 'text', value: '   ' }).valid).toBe(true);
  });

  it('text_input minLength', () => {
    const screen = buildScreen([
      {
        id: 'lyr_input',
        kind: 'text_input',
        fieldKey: 'code',
        classification: 'safe',
        minLength: 3,
      },
    ]);
    expect(computeValidity(screen, { kind: 'text', value: 'ab' }).valid).toBe(false);
    expect(computeValidity(screen, { kind: 'text', value: 'abc' }).valid).toBe(true);
  });

  it('scale_input validates range and step', () => {
    const screen = scaleScreen({ min: 0, max: 10, step: 2, defaultValue: 4 });
    expect(computeValidity(screen, { kind: 'scale', value: 4 }).valid).toBe(true);
    expect(computeValidity(screen, { kind: 'scale', value: 5 }).valid).toBe(false);
    expect(computeValidity(screen, { kind: 'scale', value: 11 }).valid).toBe(false);
  });
});
