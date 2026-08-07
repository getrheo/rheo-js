import type { PasswordRules } from '@getrheo/contracts/layers';

export type ResolvedPasswordRules = {
  minLength: number;
  maxLength: number | undefined;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
};

const SPECIAL_RE = /[^A-Za-z0-9]/u;

/**
 * Resolve effective password rules from authored `passwordRules` plus legacy
 * `minPasswordLength`. Default minimum length is 8 when neither is set.
 */
export const resolvePasswordRules = (args: {
  passwordRules?: PasswordRules | null;
  minPasswordLength?: number | null;
}): ResolvedPasswordRules => {
  const authored = args.passwordRules ?? undefined;
  const minLength =
    authored?.minLength ?? args.minPasswordLength ?? 8;
  return {
    minLength,
    maxLength: authored?.maxLength,
    requireUppercase: authored?.requireUppercase === true,
    requireLowercase: authored?.requireLowercase === true,
    requireDigit: authored?.requireDigit === true,
    requireSpecial: authored?.requireSpecial === true,
  };
};

export type PasswordRuleValidateResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Validate a password against resolved composition rules.
 * Empty passwords are rejected by callers with a required message first.
 */
export const validatePasswordAgainstRules = (
  password: string,
  rules: ResolvedPasswordRules,
): PasswordRuleValidateResult => {
  if (password.length < rules.minLength) {
    return {
      ok: false,
      reason: `Password must be at least ${rules.minLength} characters`,
    };
  }
  if (rules.maxLength !== undefined && password.length > rules.maxLength) {
    return {
      ok: false,
      reason: `Password must be at most ${rules.maxLength} characters`,
    };
  }
  if (rules.requireUppercase && !/[A-Z]/u.test(password)) {
    return { ok: false, reason: 'Password must include an uppercase letter' };
  }
  if (rules.requireLowercase && !/[a-z]/u.test(password)) {
    return { ok: false, reason: 'Password must include a lowercase letter' };
  }
  if (rules.requireDigit && !/\d/u.test(password)) {
    return { ok: false, reason: 'Password must include a number' };
  }
  if (rules.requireSpecial && !SPECIAL_RE.test(password)) {
    return { ok: false, reason: 'Password must include a special character' };
  }
  return { ok: true };
};

/**
 * iOS Automatic Strong Password descriptor string for `UITextInputPasswordRules`
 * / React Native `passwordRules`.
 */
export const iosPasswordRulesDescriptor = (
  rules: ResolvedPasswordRules,
): string => {
  const parts: string[] = [`minlength: ${rules.minLength};`];
  if (rules.maxLength !== undefined) {
    parts.push(`maxlength: ${rules.maxLength};`);
  }
  if (rules.requireUppercase) parts.push('required: upper;');
  if (rules.requireLowercase) parts.push('required: lower;');
  if (rules.requireDigit) parts.push('required: digit;');
  if (rules.requireSpecial) parts.push('required: special;');
  return parts.join(' ');
};
