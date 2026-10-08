import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildAuthCanvasManifest, buildLayerStressHarnessManifest } from '@rheo/seeds';
import {
  rendererEmailPasswordAuthModel,
  rendererEmailPasswordFieldInputType,
} from '@getrheo/renderer-core';
import type { EmailPasswordAuthLayer } from '@getrheo/contracts/layers';
import { EmailPasswordAuthSimView } from './emailPasswordAuthSimView';
import type { Ctx, RenderLayer } from '../../LayerRendererShared';

const authManifest = () => buildAuthCanvasManifest('00000000-0000-0000-0000-00000000a001');

const emailLayer = (): EmailPasswordAuthLayer => {
  const screen = authManifest().screens.find((s) => s.id === 'scr_auth_signin');
  if (!screen?.regions.body || screen.regions.body.kind !== 'stack') {
    throw new Error('sign-in screen missing');
  }
  const layer = screen.regions.body.children.find((c) => c.kind === 'email_password_auth');
  if (!layer || layer.kind !== 'email_password_auth') throw new Error('email layer missing');
  return layer;
};

const smokeCtx = (overrides?: Partial<Ctx>): Ctx => ({
  manifest: authManifest(),
  screen: authManifest().screens.find((s) => s.id === 'scr_auth_signin')!,
  locale: 'en',
  interactive: false,
  theme: 'dark',
  ...overrides,
});

const noopRender: RenderLayer = () => null;

describe('EmailPasswordAuthSimView smoke', () => {
  it('renders email and password inputs with correct types', () => {
    const html = renderToStaticMarkup(
      createElement(EmailPasswordAuthSimView, {
        layer: emailLayer(),
        ctx: smokeCtx(),
        renderLayer: noopRender,
      }),
    );
    expect(html).toContain(`type="${rendererEmailPasswordFieldInputType('email')}"`);
    expect(html).toContain(`type="${rendererEmailPasswordFieldInputType('password')}"`);
  });

  it('surfaces validation message from the shared model when empty', () => {
    const model = rendererEmailPasswordAuthModel(emailLayer(), {
      email: '',
      password: '',
      confirm: '',
    });
    expect(model.canSubmit).toBe(false);
    expect(model.validation.ok).toBe(false);
  });

  it('marks inputs disabled when not interactive and no picker', () => {
    const html = renderToStaticMarkup(
      createElement(EmailPasswordAuthSimView, {
        layer: emailLayer(),
        ctx: smokeCtx({ interactive: false }),
        renderLayer: noopRender,
      }),
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('readOnly=""');
  });

  it('renders submit button at full width', () => {
    const html = renderToStaticMarkup(
      createElement(EmailPasswordAuthSimView, {
        layer: emailLayer(),
        ctx: smokeCtx(),
        renderLayer: noopRender,
      }),
    );
    const submitButton = html.match(/<button type="button" style="([^"]*)"/);
    expect(submitButton?.[1]).toContain('width:100%');
  });

  it('renders stress harness sign-up submit at full width', () => {
    const manifest = buildLayerStressHarnessManifest('00000000-0000-0000-0000-000000000001');
    const screen = manifest.screens.find((s) => s.id === 'scr_sh_ep_up');
    if (!screen?.regions.body || screen.regions.body.kind !== 'stack') {
      throw new Error('sign-up screen missing');
    }
    const layer = screen.regions.body.children.find((c) => c.kind === 'email_password_auth');
    if (!layer || layer.kind !== 'email_password_auth') throw new Error('email layer missing');
    const html = renderToStaticMarkup(
      createElement(EmailPasswordAuthSimView, {
        layer,
        ctx: {
          manifest,
          screen,
          locale: 'en',
          interactive: false,
          theme: 'light',
        },
        renderLayer: noopRender,
      }),
    );
    const submitBlock = html.slice(html.indexOf('lyr_sh_eu_sub'));
    expect(submitBlock).toContain('width:100%');
    expect(submitBlock).toContain('Create account');
  });
});
