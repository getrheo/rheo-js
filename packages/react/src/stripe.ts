import type { ExternalSurfaceNode, NormalizedSurfaceOutcome } from '@getrheo/contracts';
import type { Branding } from '@getrheo/contracts';
import type { FlowState } from '@getrheo/flow-runtime/stateMachine';
import { getSdkLogger } from './logging.js';

export const STRIPE_RESUME_STORAGE_KEY = 'rheo_stripe_checkout_resume_v1';
export const STRIPE_RESUME_QUERY_STATUS = 'rheo_stripe_status';
export const STRIPE_RESUME_QUERY_TOKEN = 'rheo_stripe_resume';
export const STRIPE_CHECKOUT_SESSION_QUERY = 'session_id';
const STRIPE_CHECKOUT_SESSION_ID = /^cs_(?:test|live)_/;

export type StripeCheckoutResumeSnapshot = {
  v: 2;
  attemptId: string;
  channelId: string;
  surfaceId: string;
  flowId: string;
  versionId: string;
  experimentId: string | null;
  variantId: string | null;
  paymentLinkUrl: string;
  savedAt: number;
  flowState: FlowState;
  branding: Branding | null;
  mediaMap: Record<string, string>;
  attribution: Record<string, string | number | boolean>;
};

export const createResumeToken = (): string => {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

export const persistStripeResumeSnapshot = (snapshot: StripeCheckoutResumeSnapshot): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(STRIPE_RESUME_STORAGE_KEY, JSON.stringify(snapshot));
    return window.sessionStorage.getItem(STRIPE_RESUME_STORAGE_KEY) === JSON.stringify(snapshot);
  } catch {
    getSdkLogger().warn('[rheo] failed to persist Stripe resume snapshot');
    return false;
  }
};

export const loadStripeResumeSnapshot = (): StripeCheckoutResumeSnapshot | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STRIPE_RESUME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StripeCheckoutResumeSnapshot;
    if (parsed?.v !== 2 || !parsed.attemptId || !parsed.surfaceId || !parsed.flowState) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearStripeResumeSnapshot = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STRIPE_RESUME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

export type StripeReturnStatus = 'success' | 'cancel';

/**
 * Detect return from a Stripe Payment Link.
 * Authors should set After payment → Redirect to their funnel URL, ideally with
 * `rheo_stripe_status=success` (see {@link buildStripePaymentLinkReturnUrl}) or
 * Stripe's `session_id={CHECKOUT_SESSION_ID}` template.
 */
export const readStripeReturnFromSearch = (
  search: string,
): { status: StripeReturnStatus; token: string | null } | null => {
  const qs = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const statusRaw = qs.get(STRIPE_RESUME_QUERY_STATUS);
  const token = qs.get(STRIPE_RESUME_QUERY_TOKEN);
  if (statusRaw === 'success' || statusRaw === 'cancel') {
    return { status: statusRaw, token };
  }
  const sessionId = qs.get(STRIPE_CHECKOUT_SESSION_QUERY);
  if (sessionId && STRIPE_CHECKOUT_SESSION_ID.test(sessionId)) {
    return { status: 'success', token };
  }
  return null;
};

export const outcomeForStripeReturn = (status: StripeReturnStatus): NormalizedSurfaceOutcome =>
  status === 'success' ? 'purchase_completed' : 'purchase_cancelled';

/**
 * URL authors paste into Stripe Dashboard → Payment Link → After payment → Redirect.
 * Includes `rheo_stripe_status=success` so the web SDK can resume the flow.
 */
export const buildStripePaymentLinkReturnUrl = (returnBaseUrl: string): string => {
  const url = new URL(returnBaseUrl);
  url.searchParams.set(STRIPE_RESUME_QUERY_STATUS, 'success');
  return url.toString();
};

/** @deprecated Use {@link buildStripePaymentLinkReturnUrl}. Kept for older snippets. */
export const buildStripeReturnUrls = (params: {
  returnBaseUrl: string;
  token: string;
}): { successUrl: string; cancelUrl: string } => {
  const success = new URL(params.returnBaseUrl);
  success.searchParams.set(STRIPE_RESUME_QUERY_STATUS, 'success');
  success.searchParams.set(STRIPE_RESUME_QUERY_TOKEN, params.token);
  const cancel = new URL(params.returnBaseUrl);
  cancel.searchParams.set(STRIPE_RESUME_QUERY_STATUS, 'cancel');
  cancel.searchParams.set(STRIPE_RESUME_QUERY_TOKEN, params.token);
  return { successUrl: success.toString(), cancelUrl: cancel.toString() };
};

/** Stable analytics id derived from a Payment Link URL (path slug). */
export const stripeProductIdFromPaymentLink = (paymentLinkUrl: string): string => {
  try {
    const path = new URL(paymentLinkUrl).pathname.replace(/^\//, '');
    const slug = path.split('/').filter(Boolean).pop() ?? path;
    return (slug || 'stripe_payment_link').slice(0, 256);
  } catch {
    return 'stripe_payment_link';
  }
};

/**
 * Build the redirect URL: Payment Link plus `client_reference_id` for Stripe receipts
 * and optional Rheo resume token query (harmless if Stripe ignores unknown params).
 */
export const buildStripePaymentLinkRedirectUrl = (params: {
  paymentLinkUrl: string;
  token: string;
}): string => {
  const url = new URL(params.paymentLinkUrl);
  url.searchParams.set('client_reference_id', params.token);
  url.searchParams.set(STRIPE_RESUME_QUERY_TOKEN, params.token);
  return url.toString();
};

export const presentStripePaymentLink = (params: {
  node: ExternalSurfaceNode;
  attemptId: string;
  channelId: string;
  flowId: string;
  versionId: string;
  experimentId: string | null;
  variantId: string | null;
  flowState: FlowState;
  branding: Branding | null;
  mediaMap: Record<string, string>;
  attribution: Record<string, string | number | boolean>;
  /** Injected for tests; defaults to assigning window.location.href */
  redirect?: (url: string) => void;
}): { outcome: NormalizedSurfaceOutcome } | 'redirecting' => {
  const { node } = params;
  if (node.config.provider !== 'stripe') {
    return { outcome: 'failed' };
  }
  const paymentLinkUrl = node.config.paymentLinkUrl;
  if (!paymentLinkUrl) {
    getSdkLogger().warn('[rheo] Stripe surface missing paymentLinkUrl', { surfaceId: node.id });
    return { outcome: 'failed' };
  }
  const saved = persistStripeResumeSnapshot({
    v: 2,
    attemptId: params.attemptId,
    channelId: params.channelId,
    surfaceId: node.id,
    flowId: params.flowId,
    versionId: params.versionId,
    experimentId: params.experimentId,
    variantId: params.variantId,
    paymentLinkUrl,
    savedAt: Date.now(),
    flowState: params.flowState,
    branding: params.branding,
    mediaMap: params.mediaMap,
    attribution: params.attribution,
  });
  if (!saved) {
    getSdkLogger().warn('[rheo] Stripe resume snapshot was not saved; not redirecting', {
      surfaceId: node.id,
    });
    return { outcome: 'failed' };
  }
  const redirectUrl = buildStripePaymentLinkRedirectUrl({
    paymentLinkUrl,
    token: params.attemptId,
  });
  const redirect =
    params.redirect ??
    ((next: string) => {
      window.location.assign(next);
    });
  redirect(redirectUrl);
  return 'redirecting';
};
