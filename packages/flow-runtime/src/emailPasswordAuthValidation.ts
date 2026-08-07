import type { PasswordRules } from '@getrheo/contracts/layers';
import {
  resolvePasswordRules,
  validatePasswordAgainstRules,
  type ResolvedPasswordRules,
} from './passwordRules';

/** Basic email shape check — host apps should still verify server-side. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailPasswordAuthFieldSlot = 'email' | 'password' | 'confirm';

export type EmailPasswordAuthFieldErrors = Partial<
  Record<EmailPasswordAuthFieldSlot, string>
>;

export type ValidateEmailPasswordAuthArgs = {
  mode: 'sign_in' | 'sign_up';
  email: string;
  password: string;
  confirmPassword: string;
  /** @deprecated Prefer `passwordRules`. */
  minPasswordLength?: number;
  passwordRules?: PasswordRules | null;
};

export type ValidateEmailPasswordAuthResult =
  | { ok: true }
  | { ok: false; message: string; fields: EmailPasswordAuthFieldErrors };

export const resolveEmailPasswordRules = (args: {
  passwordRules?: PasswordRules | null;
  minPasswordLength?: number | null;
}): ResolvedPasswordRules => resolvePasswordRules(args);

export const validateEmailPasswordAuthFields = (
  args: ValidateEmailPasswordAuthArgs,
): ValidateEmailPasswordAuthResult => {
  const fields: EmailPasswordAuthFieldErrors = {};
  const email = args.email.trim();
  if (!email) {
    fields.email = 'Email is required';
  } else if (!EMAIL_RE.test(email)) {
    fields.email = 'Enter a valid email';
  }

  const rules = resolvePasswordRules({
    passwordRules: args.passwordRules,
    minPasswordLength: args.minPasswordLength,
  });

  if (!args.password) {
    fields.password = 'Password is required';
  } else {
    const pw = validatePasswordAgainstRules(args.password, rules);
    if (!pw.ok) fields.password = pw.reason;
  }

  if (args.mode === 'sign_up') {
    if (!args.confirmPassword) {
      fields.confirm = 'Confirm your password';
    } else if (args.password !== args.confirmPassword) {
      fields.confirm = 'Passwords do not match';
    }
  }

  const order: EmailPasswordAuthFieldSlot[] = ['email', 'password', 'confirm'];
  const first = order.map((slot) => fields[slot]).find((m) => m !== undefined);
  if (first) {
    return { ok: false, message: first, fields };
  }
  return { ok: true };
};
