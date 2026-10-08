import { createElement, useEffect, type ReactNode } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { RheoProvider, type RheoConfig } from './client.js';
import { resetChannelExposureForTests } from './channel.js';
import { useChannel } from './useChannel.js';

const codeBody = {
  kind: 'code',
  channelId: 'ch_code',
  environment: 'test',
  assignmentVersion: 3,
  experiment: {
    id: '11111111-1111-4111-8111-111111111111',
    variantKey: 'treatment',
    variantId: '33333333-3333-4333-8333-333333333333',
  },
  variantKey: 'treatment',
  parameters: { enabled: false, headline: 'Hi', empty: null },
};

const Harness = ({ onValue }: { onValue: (value: ReturnType<typeof useChannel>) => void }) => {
  const value = useChannel({ channelId: 'ch_code' });
  useEffect(() => {
    onValue(value);
  });
  return null;
};

describe('useChannel', () => {
  it('exposes get and logs experiment_exposed once until assignment changes', async () => {
    resetChannelExposureForTests();
    const calls: string[] = [];
    const latest: { current: ReturnType<typeof useChannel> | null } = { current: null };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith('/v1/sdk/resolve')) {
        return new Response(JSON.stringify(codeBody), { status: 200 });
      }
      return new Response(JSON.stringify({ accepted: 1 }), { status: 200 });
    });
    const box: { current: ReturnType<typeof useChannel> | null } = { current: null };
    await act(async () => {
      TestRenderer.create(
        createElement(
          RheoProvider,
          {
            config: {
              publishableKey: 'ob_pk_test',
              apiBaseUrl: 'https://api.test',
              fetcher: fetcher as unknown as typeof fetch,
              userId: 'user_1',
              attribution: { enabled: false },
            } satisfies RheoConfig,
            children: createElement(Harness, {
              onValue: (value) => {
                box.current = value;
                latest.current = value;
              },
            }) as ReactNode,
          },
        ),
      );
      await new Promise((r) => setTimeout(r, 0));
    });
    const view = latest.current?.channel ?? null;
    expect(box.current?.loading).toBe(false);
    expect(view?.kind).toBe('code');
    if (view?.kind === 'code') {
      expect(view.get('enabled', true)).toBe(false);
      expect(view.get('missing', 'fallback')).toBe('fallback');
      expect(view.get('headline', 1)).toBe(1);
      expect(view.get('empty', null)).toBeNull();
    }
    const exposed = calls.filter((url) => url.endsWith('/v1/sdk/code-events'));
    expect(exposed).toHaveLength(1);
  });
});
