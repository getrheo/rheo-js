import { describe, expect, it } from 'vitest';
import type { TextInputLayer } from '@getrheo/contracts/layers';
import { filterDigitsOnlyInput, validateTextInputValue } from './textInputValidation';

const numberLayer = (): TextInputLayer => ({
  id: 'lyr_number',
  kind: 'text_input',
  fieldKey: 'amount',
  classification: 'safe',
  inputType: 'number',
  required: true,
});

describe('filterDigitsOnlyInput', () => {
  it('strips non-digit characters', () => {
    expect(filterDigitsOnlyInput('12a3.4-5')).toBe('12345');
  });
});

describe('validateTextInputValue', () => {
  it('accepts digits for number inputType', () => {
    expect(validateTextInputValue(numberLayer(), '12345')).toEqual({ ok: true });
  });

  it('rejects non-digit values for number inputType', () => {
    expect(validateTextInputValue(numberLayer(), '12a3')).toEqual({
      ok: false,
      reason: 'Enter numbers only',
    });
  });
});
