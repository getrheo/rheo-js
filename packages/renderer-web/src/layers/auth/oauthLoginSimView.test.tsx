import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildAuthCanvasManifest } from '@rheo/seeds';
import {
  rendererOAuthPresetBrandModel,
  rendererOAuthRowInteractionModel,
} from '@getrheo/renderer-core';
import type { OAuthLoginLayer } from '@getrheo/contracts/layers';
import { OAuthLoginSimView } from './oauthLoginSimView';
import type { Ctx, RenderLayer } from '../../LayerRendererShared';

const authManifest = () => buildAuthCanvasManifest('00000000-0000-0000-0000-00000000a001');

const oauthLayer = (): OAuthLoginLayer => {
  const screen = authManifest().screens.find((s) => s.id === 'scr_auth_oauth');
  if (!screen?.regions.body || screen.regions.body.kind !== 'stack') {
    throw new Error('oauth screen missing');
  }
  const layer = screen.regions.body.children.find((c) => c.kind === 'oauth_login');
  if (!layer || layer.kind !== 'oauth_login') throw new Error('oauth layer missing');
  return layer;
};

const smokeCtx = (overrides?: Partial<Ctx>): Ctx => ({
  manifest: authManifest(),
  screen: authManifest().screens.find((s) => s.id === 'scr_auth_oauth')!,
  locale: 'en',
  interactive: false,
  theme: 'light',
  ...overrides,
});

const noopRender: RenderLayer = () => null;

describe('OAuthLoginSimView smoke', () => {
  it('renders google and apple preset brand colors', () => {
    const google = rendererOAuthPresetBrandModel('google', 'light');
    const apple = rendererOAuthPresetBrandModel('apple', 'dark');
    const htmlLight = renderToStaticMarkup(
      createElement(OAuthLoginSimView, {
        layer: oauthLayer(),
        ctx: smokeCtx({ theme: 'light' }),
        renderLayer: noopRender,
      }),
    );
    const htmlDark = renderToStaticMarkup(
      createElement(OAuthLoginSimView, {
        layer: oauthLayer(),
        ctx: smokeCtx({ theme: 'dark' }),
        renderLayer: noopRender,
      }),
    );
    expect(htmlLight).toContain(google.backgroundColor);
    expect(htmlDark).toContain(apple.backgroundColor);
  });

  it('disables non-pending rows when another row is pending (model parity)', () => {
    const rowKey = 'lyr_ac_oa_goog';
    const model = rendererOAuthRowInteractionModel({
      interactive: true,
      pendingRowKey: rowKey,
      rowKey: 'lyr_ac_oa_ap',
    });
    expect(model).toEqual({ disabled: true, busy: false });
  });

  it('allows static picker rows without disabled when onSelectLayer is set', () => {
    const html = renderToStaticMarkup(
      createElement(OAuthLoginSimView, {
        layer: oauthLayer(),
        ctx: smokeCtx({ onSelectLayer: () => undefined }),
        renderLayer: noopRender,
      }),
    );
    expect(html).not.toContain('disabled=""');
  });

  it('renders custom provider button at full width', () => {
    const html = renderToStaticMarkup(
      createElement(OAuthLoginSimView, {
        layer: oauthLayer(),
        ctx: smokeCtx(),
        renderLayer: noopRender,
      }),
    );
    const customBlock = html.slice(html.indexOf('data-layer-id="lyr_ac_oa_cu"'));
    expect(customBlock).toContain('width:100%');
    expect(customBlock).toContain('Enterprise SSO');
  });
});
