import { describe, expect, it } from 'vitest';
import { validateEmailPasswordAuthFields } from './emailPasswordAuthValidation';

describe('validateEmailPasswordAuthFields', () => {
  it('returns field-level errors for invalid email', () => {
    const result = validateEmailPasswordAuthFields({
      mode: 'sign_in',
      email: 'bad',
      password: 'password1',
      confirmPassword: '',
      minPasswordLength: 8,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fields.email).toMatch(/valid email/i);
      expect(result.message).toBe(result.fields.email);
    }
  });

  it('enforces password composition rules', () => {
    const result = validateEmailPasswordAuthFields({
      mode: 'sign_up',
      email: 'a@example.com',
      password: 'password1',
      confirmPassword: 'password1',
      passwordRules: { minLength: 8, requireUppercase: true },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fields.password).toMatch(/uppercase/i);
    }
  });

  it('accepts valid sign_up with rules', () => {
    const result = validateEmailPasswordAuthFields({
      mode: 'sign_up',
      email: 'a@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      passwordRules: {
        minLength: 8,
        requireUppercase: true,
        requireDigit: true,
        requireSpecial: true,
      },
    });
    expect(result).toEqual({ ok: true });
  });
});
