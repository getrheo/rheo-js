import { describe, expect, it } from 'vitest';
import type {
  AddressInputLayer,
  DateTimeInputLayer,
  NumberStepperLayer,
  PhoneInputLayer,
} from '@getrheo/contracts/layers';
import { validateDateTimeInputValue } from './dateTimeInputValidation.js';
import {
  defaultNumberStepperValue,
  snapNumberStepperValue,
  stepNumberStepperValue,
} from './numberStepperValidation.js';
import { phoneDraftToE164, validatePhoneInputValue } from './phoneInputValidation.js';
import {
  emptyAddressValue,
  normalizeAddressValue,
  validateAddressInputValue,
} from './addressInputValidation.js';

const dateLayer = (over: Partial<DateTimeInputLayer> = {}): DateTimeInputLayer => ({
  id: 'lyr_dt',
  kind: 'date_time_input',
  fieldKey: 'birthday',
  mode: 'date',
  classification: 'safe',
  ...over,
});

const stepperLayer = (over: Partial<NumberStepperLayer> = {}): NumberStepperLayer => ({
  id: 'lyr_ns',
  kind: 'number_stepper',
  fieldKey: 'qty',
  min: 1,
  max: 5,
  classification: 'safe',
  children: [
    { id: 'lyr_ns_dec', kind: 'number_stepper_button', role: 'decrement' },
    { id: 'lyr_ns_val', kind: 'number_stepper_value' },
    { id: 'lyr_ns_inc', kind: 'number_stepper_button', role: 'increment' },
  ],
  ...over,
});

const phoneLayer = (over: Partial<PhoneInputLayer> = {}): PhoneInputLayer => ({
  id: 'lyr_ph',
  kind: 'phone_input',
  fieldKey: 'phone',
  classification: 'safe',
  ...over,
});

const addressLayer = (over: Partial<AddressInputLayer> = {}): AddressInputLayer => ({
  id: 'lyr_ad',
  kind: 'address_input',
  fieldKey: 'address',
  classification: 'safe',
  ...over,
});

describe('dateTimeInputValidation', () => {
  it('accepts ISO dates and rejects invalid calendar days', () => {
    expect(validateDateTimeInputValue(dateLayer(), '2000-02-29').ok).toBe(true);
    expect(validateDateTimeInputValue(dateLayer(), '2001-02-29').ok).toBe(false);
  });

  it('enforces min/max bounds', () => {
    const layer = dateLayer({ min: '2000-01-01', max: '2000-12-31' });
    expect(validateDateTimeInputValue(layer, '1999-12-31').ok).toBe(false);
    expect(validateDateTimeInputValue(layer, '2000-06-15').ok).toBe(true);
  });

  it('validates time mode', () => {
    const layer = dateLayer({ mode: 'time' });
    expect(validateDateTimeInputValue(layer, '09:30').ok).toBe(true);
    expect(validateDateTimeInputValue(layer, '25:00').ok).toBe(false);
  });
});

describe('numberStepperValidation', () => {
  it('snaps and steps within range', () => {
    const layer = stepperLayer({ step: 2 });
    expect(snapNumberStepperValue(layer, 3)).toBe(3);
    expect(stepNumberStepperValue(layer, 1, 1)).toBe(3);
    expect(stepNumberStepperValue(layer, 5, 1)).toBe(5);
    expect(defaultNumberStepperValue(layer)).toBe(1);
  });
});

describe('phoneInputValidation', () => {
  it('builds E.164 and validates national numbers', () => {
    const layer = phoneLayer({ defaultCountryCode: 'US' });
    expect(validatePhoneInputValue(layer, { countryCode: 'US', nationalNumber: '5550100' }).ok).toBe(
      true,
    );
    expect(phoneDraftToE164({ countryCode: 'US', nationalNumber: '5550100' })).toBe('+15550100');
    expect(validatePhoneInputValue(layer, { countryCode: 'US', nationalNumber: '12' }).ok).toBe(
      false,
    );
  });
});

describe('addressInputValidation', () => {
  it('requires default address fields', () => {
    const layer = addressLayer();
    const empty = emptyAddressValue(layer);
    expect(validateAddressInputValue(layer, empty).ok).toBe(false);
    const filled = normalizeAddressValue(layer, {
      line1: '123 Main',
      city: 'SF',
      postalCode: '94105',
      country: 'us',
      region: 'CA',
    });
    expect(filled.country).toBe('US');
    expect(validateAddressInputValue(layer, filled).ok).toBe(true);
  });
});
