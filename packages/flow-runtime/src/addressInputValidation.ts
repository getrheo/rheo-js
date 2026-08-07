import type {
  AddressInputField,
  AddressInputLayer,
  AddressValue,
} from '@getrheo/contracts/layers';
import { ADDRESS_INPUT_FIELDS } from '@getrheo/contracts/layers';

export type AddressValidateResult = { ok: true } | { ok: false; reason: string };

export const DEFAULT_ADDRESS_REQUIRED_FIELDS: readonly AddressInputField[] = [
  'line1',
  'city',
  'postalCode',
  'country',
] as const;

export const addressRequiredFields = (layer: AddressInputLayer): readonly AddressInputField[] =>
  layer.requiredFields ?? DEFAULT_ADDRESS_REQUIRED_FIELDS;

export const addressVisibleFields = (layer: AddressInputLayer): readonly AddressInputField[] =>
  ADDRESS_INPUT_FIELDS.filter((f: AddressInputField) => {
    if (f === 'line2' && layer.showLine2 === false) return false;
    if (f === 'region' && layer.showRegion === false) return false;
    return true;
  });

export const emptyAddressValue = (layer: AddressInputLayer): AddressValue => ({
  line1: '',
  line2: layer.showLine2 === false ? undefined : '',
  city: '',
  region: layer.showRegion === false ? undefined : '',
  postalCode: '',
  country: (layer.defaultCountryCode ?? 'US').toUpperCase(),
});

const fieldLabel = (field: AddressInputField): string => {
  switch (field) {
    case 'line1':
      return 'street address';
    case 'line2':
      return 'address line 2';
    case 'city':
      return 'city';
    case 'region':
      return 'state / region';
    case 'postalCode':
      return 'postal code';
    case 'country':
      return 'country';
    default:
      return field;
  }
};

export const validateAddressInputValue = (
  layer: AddressInputLayer,
  value: AddressValue,
): AddressValidateResult => {
  const visible = new Set(addressVisibleFields(layer));
  for (const field of addressRequiredFields(layer)) {
    if (!visible.has(field)) continue;
    const raw = value[field];
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return { ok: false, reason: `Enter a ${fieldLabel(field)}` };
    }
  }
  if (value.country && !/^[A-Za-z]{2}$/u.test(value.country.trim())) {
    return { ok: false, reason: 'Enter a valid country code' };
  }
  return { ok: true };
};

export const normalizeAddressValue = (
  layer: AddressInputLayer,
  value: AddressValue,
): AddressValue => {
  const visible = addressVisibleFields(layer);
  const out: AddressValue = {
    line1: value.line1.trim(),
    city: value.city.trim(),
    postalCode: value.postalCode.trim(),
    country: value.country.trim().toUpperCase(),
  };
  if (visible.includes('line2')) {
    const line2 = (value.line2 ?? '').trim();
    if (line2.length > 0) out.line2 = line2;
  }
  if (visible.includes('region')) {
    const region = (value.region ?? '').trim();
    if (region.length > 0) out.region = region;
  }
  return out;
};
