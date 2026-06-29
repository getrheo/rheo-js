import type { TextInputLayer } from '@getrheo/contracts/layers';

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/** Phone: raw string as typed; allow common dial characters, length bounds. */
const PHONE_RE = /^[\d\s+().-]{3,32}$/u;

const isProbablyUrl = (s: string): boolean => {
  try {
    const withProto = /^[a-z]+:/iu.test(s) ? s : `https://${s}`;
    const u = new URL(withProto);
    return u.hostname.length > 0;
  } catch {
    return false;
  }
};

export type TextInputValidateResult = { ok: true } | { ok: false; reason: string };

const effectiveInputType = (layer: TextInputLayer) => layer.inputType ?? 'plain';

const effectiveRequired = (layer: TextInputLayer): boolean => layer.required !== false;

/**
 * Validate trimmed text for a `text_input` layer (length, required, format by inputType).
 */
export const validateTextInputValue = (layer: TextInputLayer, raw: string): TextInputValidateResult => {
  const trimmed = raw.trim();
  const required = effectiveRequired(layer);

  if (trimmed.length === 0) {
    if (!required) return { ok: true };
    return { ok: false, reason: 'Text is empty' };
  }

  if (layer.minLength !== undefined && trimmed.length < layer.minLength) {
    return { ok: false, reason: `Enter at least ${layer.minLength} characters` };
  }

  if (layer.maxLength !== undefined && trimmed.length > layer.maxLength) {
    return { ok: false, reason: `Exceeds max length of ${layer.maxLength}` };
  }

  const mode = effectiveInputType(layer);
  switch (mode) {
    case 'plain':
    case 'multiline':
      return { ok: true };
    case 'email':
      return EMAIL_RE.test(trimmed)
        ? { ok: true }
        : { ok: false, reason: 'Enter a valid email address' };
    case 'phone':
      return PHONE_RE.test(trimmed)
        ? { ok: true }
        : { ok: false, reason: 'Enter a valid phone number (digits and common symbols only)' };
    case 'url':
      return isProbablyUrl(trimmed) ? { ok: true } : { ok: false, reason: 'Enter a valid URL' };
    default:
      return { ok: true };
  }
};
