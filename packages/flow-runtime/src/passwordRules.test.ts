import { describe, expect, it } from 'vitest';
import {
  iosPasswordRulesDescriptor,
  resolvePasswordRules,
  validatePasswordAgainstRules,
} from './passwordRules';

describe('resolvePasswordRules', () => {
  it('defaults min length to 8', () => {
    expect(resolvePasswordRules({})).toMatchObject({ minLength: 8 });
  });

  it('prefers passwordRules.minLength over legacy minPasswordLength', () => {
    expect(
      resolvePasswordRules({
        minPasswordLength: 6,
        passwordRules: { minLength: 12 },
      }).minLength,
    ).toBe(12);
  });
});

describe('validatePasswordAgainstRules', () => {
  const base = resolvePasswordRules({
    passwordRules: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireSpecial: true,
    },
  });

  it('accepts a password that satisfies all rules', () => {
    expect(validatePasswordAgainstRules('Abcd123!', base)).toEqual({ ok: true });
  });

  it('rejects missing uppercase', () => {
    const r = validatePasswordAgainstRules('abcd123!', base);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/uppercase/i);
  });

  it('rejects missing special', () => {
    const r = validatePasswordAgainstRules('Abcd1234', base);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/special/i);
  });
});

describe('iosPasswordRulesDescriptor', () => {
  it('emits iOS Automatic Strong Password format', () => {
    const rules = resolvePasswordRules({
      passwordRules: {
        minLength: 10,
        maxLength: 64,
        requireUppercase: true,
        requireDigit: true,
      },
    });
    expect(iosPasswordRulesDescriptor(rules)).toBe(
      'minlength: 10; maxlength: 64; required: upper; required: digit;',
    );
  });
});
