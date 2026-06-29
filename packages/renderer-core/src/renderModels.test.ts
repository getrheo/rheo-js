import { describe, expect, it } from 'vitest';
import type {
  MultipleChoiceLayer,
  ScaleInputLayer,
  StackLayer,
  TextInputLayer,
} from '@getrheo/contracts/layers';
import type { Branding } from '@getrheo/contracts/branding';
import {
  nativeFontRegistrationNameForStyle,
  rendererButtonActionModel,
  rendererChoiceSelectionModel,
  rendererLayoutModel,
  rendererScaleInputModel,
  rendererSurfaceModel,
  rendererTextInputModel,
  rendererTypographyModel,
} from './index';

const branding: Branding = {
  colorPresets: [],
  gradientPresets: [],
  fontFamilies: [
    {
      id: '00000000-0000-4000-8000-000000000101',
      name: 'Inter',
      styles: [
        {
          id: '00000000-0000-4000-8000-000000000102',
          weight: 700,
          italic: false,
          url: 'https://example.com/inter-bold.ttf',
        },
      ],
    },
  ],
};

describe('renderer-core render models', () => {
  it('normalizes layout box edges and absolute inset data', () => {
    expect(
      rendererLayoutModel({
        padding: { t: 1, r: 2 },
        margin: { b: 3, l: 4 },
        width: 'full',
        height: 'fill',
        position: 'absolute',
        inset: { t: 5 },
        zIndex: 9,
      }),
    ).toEqual({
      padding: { top: 1, right: 2, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 3, left: 4 },
      width: 'full',
      height: 'fill',
      position: 'absolute',
      inset: { top: 5, right: 0, bottom: 0, left: 0 },
      zIndex: 9,
    });
  });

  it('resolves typography for web and native adapters', () => {
    const model = rendererTypographyModel({
      style: {
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: 700,
        color: '$foreground',
        align: 'center',
        lineHeight: 1.2,
      },
      theme: { foreground: '#111111' },
      palette: 'light',
      branding,
    });

    expect(model.color).toBe('#111111');
    expect(model.webFontFamily).toContain('Inter');
    expect(model.nativeFontFamily).toBe(
      nativeFontRegistrationNameForStyle('00000000-0000-4000-8000-000000000102'),
    );
    expect(model.align).toBe('center');
  });

  it('resolves surface background, border, opacity, and shadows', () => {
    const model = rendererSurfaceModel({
      style: {
        radius: 12,
        opacity: 0.8,
        background: '$primary',
        border: { width: 2, color: { light: '#eeeeee', dark: '#111111' } },
        shadow: { offsetY: 4, blur: 12, color: '#000000', opacity: 0.2 },
      },
      theme: { primary: '#ff0000' },
      palette: 'light',
    });

    expect(model.radius).toBe(12);
    expect(model.background).toBe('#ff0000');
    expect(model.nativeBackgroundColor).toBe('#ff0000');
    expect(model.borderColor).toBe('#eeeeee');
    expect(model.webBoxShadow).toContain('rgba(0,0,0,0.2)');
    expect(model.nativeShadow.elevation).toBeGreaterThan(0);
  });

  it('summarizes button action behavior and disabled reasons', () => {
    const model = rendererButtonActionModel({
      action: { kind: 'continue' },
      mode: 'interactive',
      checkboxContinueBlocked: true,
      inputDraftInvalid: true,
    });

    expect(model.submitsScreen).toBe(true);
    expect(model.disabled).toBe(true);
    expect(model.disabledReasons).toEqual(['checkbox-blocked', 'input-invalid']);
  });

  it('normalizes text, scale, and choice input state', () => {
    const textLayer: TextInputLayer = {
      id: 'lyr_text',
      kind: 'text_input',
      fieldKey: 'email',
      classification: 'safe',
      inputType: 'email',
      required: true,
    };
    expect(rendererTextInputModel(textLayer, 'nope').valid).toBe(false);
    expect(rendererTextInputModel(textLayer, ' a@example.com ').trimmedValue).toBe('a@example.com');

    const scaleLayer: ScaleInputLayer = {
      id: 'lyr_scale',
      kind: 'scale_input',
      fieldKey: 'score',
      min: 0,
      max: 10,
      step: 2,
    };
    expect(rendererScaleInputModel(scaleLayer, 5)).toMatchObject({
      snappedValue: 6,
      step: 2,
      inRange: true,
      onStep: false,
    });

    const optionStack: StackLayer = {
      id: 'lyr_option',
      kind: 'stack',
      direction: 'vertical',
      children: [],
    };
    const choiceLayer: MultipleChoiceLayer = {
      id: 'lyr_choice',
      kind: 'multiple_choice',
      fieldKey: 'goals',
      children: [optionStack],
      optionBindings: [{ optionId: 'a', rootLayerId: optionStack.id }],
      branching: { enabled: false, conditions: [] },
      maxSelections: 1,
    };
    expect(rendererChoiceSelectionModel(choiceLayer, ['a']).canToggleMore).toBe(false);
  });
});
