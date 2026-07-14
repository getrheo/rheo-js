import { describe, expect, it } from 'vitest';
import type { IconLayer, StackLayer, TextLayer } from '@getrheo/contracts/layers';
import { applyChoiceOptionSelectionToStack } from './choiceOptionSelection';

const optionStack = (): StackLayer => ({
  id: 'opt_a',
  kind: 'stack',
  direction: 'horizontal',
  style: { border: { width: 1, color: '#ccc' } },
  selectedStyle: { border: { width: 2, color: '#000' } },
  children: [
    {
      id: 'opt_a_label',
      kind: 'text',
      text: { default: 'Society' },
    },
    {
      id: 'opt_a_indicator',
      kind: 'stack',
      direction: 'horizontal',
      style: {
        width: 24,
        height: 24,
        radius: 12,
        border: { width: 1, color: '#ccc' },
      },
      selectedStyle: {
        background: '#98C1C1',
        border: { width: 2, color: '#000' },
      },
      children: [
        {
          id: 'opt_a_indicator_sel',
          kind: 'icon',
          family: 'ionicons',
          iconName: 'checkmark',
          style: { width: 14, height: 14, color: '#000' },
        },
      ],
    },
  ],
});

describe('applyChoiceOptionSelectionToStack', () => {
  it('merges root and nested selectedStyle when selected', () => {
    const out = applyChoiceOptionSelectionToStack(optionStack(), true, 390);
    expect(out.style?.border?.width).toBe(2);
    const indicator = out.children?.[1] as StackLayer;
    expect(indicator.kind).toBe('stack');
    expect(indicator.style?.background).toBe('#98C1C1');
  });

  it('shows _sel icons only when selected', () => {
    const unselected = applyChoiceOptionSelectionToStack(optionStack(), false, 390);
    const selected = applyChoiceOptionSelectionToStack(optionStack(), true, 390);
    const unselIcon = (unselected.children?.[1] as StackLayer).children?.[0] as IconLayer | undefined;
    const selIcon = (selected.children?.[1] as StackLayer).children?.[0] as IconLayer | undefined;
    expect(unselIcon?.kind).toBe('icon');
    expect(unselIcon?.style?.opacity).toBe(0);
    expect(selIcon?.style?.opacity).toBe(1);
  });

  it('merges nested text selectedStyle when selected', () => {
    const stack: StackLayer = {
      id: 'opt',
      kind: 'stack',
      direction: 'horizontal',
      children: [
        {
          id: 'opt_label',
          kind: 'text',
          text: { default: 'Fun' },
          style: { color: '#111111' },
          selectedStyle: { color: '#1899D6', fontWeight: 600 },
        },
      ],
    };
    const unselected = applyChoiceOptionSelectionToStack(stack, false, 390);
    const selected = applyChoiceOptionSelectionToStack(stack, true, 390);
    const unselLabel = unselected.children?.[0] as TextLayer;
    const selLabel = selected.children?.[0] as TextLayer;
    expect(unselLabel.style?.color).toBe('#111111');
    expect(selLabel.style?.color).toBe('#1899D6');
    expect(selLabel.style?.fontWeight).toBe(600);
  });
});
