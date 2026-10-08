import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExternalSurfaceNode } from '@getrheo/contracts';
import type { FlowState } from '@getrheo/flow-runtime/stateMachine';
import {
  buildStripePaymentLinkRedirectUrl,
  buildStripePaymentLinkReturnUrl,
  clearStripeResumeSnapshot,
  loadStripeResumeSnapshot,
  outcomeForStripeReturn,
  persistStripeResumeSnapshot,
  presentStripePaymentLink,
  readStripeReturnFromSearch,
  STRIPE_RESUME_STORAGE_KEY,
  stripeProductIdFromPaymentLink,
} from './stripe.js';

const snapshotBase = {
  v: 2 as const,
  attemptId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  channelId: 'ch_1',
  surfaceId: 'surf_pay',
  flowId: '00000000-0000-4000-8000-000000000001',
  versionId: '00000000-0000-4000-8000-000000000002',
  experimentId: null,
  variantId: null,
  paymentLinkUrl: 'https://buy.stripe.com/test_abc',
  savedAt: 1,
  flowState: { status: 'running' } as FlowState,
  branding: null,
  mediaMap: {},
  attribution: {},
};

afterEach(() => {
  clearStripeResumeSnapshot();
  sessionStorage.clear();
});

describe('stripe Payment Link helpers', () => {
  it('parses return query and maps outcomes', () => {
    expect(readStripeReturnFromSearch('?rheo_stripe_status=success&rheo_stripe_resume=abc')).toEqual(
      {
        status: 'success',
        token: 'abc',
      },
    );
    expect(readStripeReturnFromSearch('?session_id=cs_test_123')).toEqual({
      status: 'success',
      token: null,
    });
    expect(readStripeReturnFromSearch('?session_id=not-a-session')).toBeNull();
    expect(outcomeForStripeReturn('success')).toBe('purchase_completed');
    expect(outcomeForStripeReturn('cancel')).toBe('purchase_cancelled');
  });

  it('builds Payment Link return and redirect URLs', () => {
    expect(buildStripePaymentLinkReturnUrl('https://app.example.com/onboarding')).toContain(
      'rheo_stripe_status=success',
    );
    const redirect = buildStripePaymentLinkRedirectUrl({
      paymentLinkUrl: 'https://buy.stripe.com/test_abc',
      token: 'tok123',
    });
    expect(redirect).toContain('client_reference_id=tok123');
    expect(redirect).toContain('rheo_stripe_resume=tok123');
  });

  it('persists and clears resume snapshots in sessionStorage', () => {
    persistStripeResumeSnapshot(snapshotBase);
    expect(loadStripeResumeSnapshot()?.surfaceId).toBe('surf_pay');
    expect(sessionStorage.getItem(STRIPE_RESUME_STORAGE_KEY)).toBeTruthy();
    clearStripeResumeSnapshot();
    expect(loadStripeResumeSnapshot()).toBeNull();
  });

  it('redirects to the Payment Link', () => {
    const redirect = vi.fn();
    const node: ExternalSurfaceNode = {
      id: 'surf_pay',
      config: { provider: 'stripe', paymentLinkUrl: 'https://buy.stripe.com/test_abc' },
      outcomes: {},
      fallback: null,
    };
    const result = presentStripePaymentLink({
      node,
      attemptId: snapshotBase.attemptId,
      channelId: 'ch_1',
      flowId: snapshotBase.flowId,
      versionId: snapshotBase.versionId,
      experimentId: null,
      variantId: null,
      flowState: snapshotBase.flowState,
      branding: null,
      mediaMap: {},
      attribution: {},
      redirect,
    });
    expect(result).toBe('redirecting');
    expect(redirect).toHaveBeenCalledWith(
      expect.stringContaining('https://buy.stripe.com/test_abc'),
    );
    expect(loadStripeResumeSnapshot()?.paymentLinkUrl).toBe('https://buy.stripe.com/test_abc');
    expect(stripeProductIdFromPaymentLink('https://buy.stripe.com/test_abc')).toBe('test_abc');
  });

  it('fails when paymentLinkUrl is missing', () => {
    const node: ExternalSurfaceNode = {
      id: 'surf_pay',
      config: { provider: 'stripe' },
      outcomes: {},
      fallback: null,
    };
    expect(
      presentStripePaymentLink({
        node,
        attemptId: snapshotBase.attemptId,
        channelId: 'ch_1',
        flowId: snapshotBase.flowId,
        versionId: snapshotBase.versionId,
        experimentId: null,
        variantId: null,
        flowState: snapshotBase.flowState,
        branding: null,
        mediaMap: {},
        attribution: {},
        redirect: vi.fn(),
      }),
    ).toEqual({ outcome: 'failed' });
  });
});
