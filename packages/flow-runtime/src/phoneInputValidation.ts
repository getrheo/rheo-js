import type { PhoneInputLayer } from '@getrheo/contracts/layers';
import { countryDialEntry, filterCountryDialEntries } from './countryDialCodes.js';

export type PhoneDraftValue = {
  countryCode: string;
  nationalNumber: string;
};

export type PhoneValidateResult = { ok: true } | { ok: false; reason: string };

export const defaultPhoneCountryCode = (layer: PhoneInputLayer): string => {
  const allowed = filterCountryDialEntries(layer.allowedCountryCodes);
  const preferred = (layer.defaultCountryCode ?? 'US').toUpperCase();
  if (allowed.some((e) => e.code === preferred)) return preferred;
  return allowed[0]?.code ?? 'US';
};

/** Digits-only national number while typing. */
export const filterPhoneNationalInput = (raw: string): string => raw.replace(/\D/g, '').slice(0, 15);

export const buildE164 = (countryCode: string, nationalNumber: string): string | null => {
  const entry = countryDialEntry(countryCode);
  const digits = filterPhoneNationalInput(nationalNumber);
  if (!entry || digits.length < 4) return null;
  // Drop a leading 0 often typed for local trunk prefixes.
  const national = digits.replace(/^0+/u, '') || digits;
  if (national.length < 4 || national.length > 14) return null;
  return `+${entry.dial}${national}`;
};

export const validatePhoneInputValue = (
  layer: PhoneInputLayer,
  draft: PhoneDraftValue,
): PhoneValidateResult => {
  const required = layer.required !== false;
  const national = filterPhoneNationalInput(draft.nationalNumber);
  if (national.length === 0) {
    if (!required) return { ok: true };
    return { ok: false, reason: 'Enter a phone number' };
  }
  const allowed = filterCountryDialEntries(layer.allowedCountryCodes);
  const code = draft.countryCode.toUpperCase();
  if (!allowed.some((e) => e.code === code)) {
    return { ok: false, reason: 'Select a valid country' };
  }
  const e164 = buildE164(code, national);
  if (!e164) {
    return { ok: false, reason: 'Enter a valid phone number' };
  }
  return { ok: true };
};

export const phoneDraftToE164 = (draft: PhoneDraftValue): string => {
  const e164 = buildE164(draft.countryCode, draft.nationalNumber);
  return e164 ?? '';
};
