/** Basic email shape check — host apps should still verify server-side. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidateEmailPasswordAuthArgs = {
  mode: 'sign_in' | 'sign_up';
  email: string;
  password: string;
  confirmPassword: string;
  minPasswordLength: number;
};

export type ValidateEmailPasswordAuthResult =
  | { ok: true }
  | { ok: false; message: string };

export const validateEmailPasswordAuthFields = (
  args: ValidateEmailPasswordAuthArgs,
): ValidateEmailPasswordAuthResult => {
  const email = args.email.trim();
  if (!email) return { ok: false, message: 'Email is required' };
  if (!EMAIL_RE.test(email)) return { ok: false, message: 'Enter a valid email' };
  if (!args.password) return { ok: false, message: 'Password is required' };
  if (args.password.length < args.minPasswordLength) {
    return {
      ok: false,
      message: `Password must be at least ${args.minPasswordLength} characters`,
    };
  }
  if (args.mode === 'sign_up') {
    if (!args.confirmPassword) return { ok: false, message: 'Confirm your password' };
    if (args.password !== args.confirmPassword) {
      return { ok: false, message: 'Passwords do not match' };
    }
  }
  return { ok: true };
};
