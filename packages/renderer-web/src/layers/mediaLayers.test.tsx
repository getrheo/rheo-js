import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { layerSmokeManifest, layerSmokeScreen } from '@rheo/contracts-fixtures/layerSmoke';
import type { IconLayer, ImageLayer, LottieLayer, VideoLayer } from '@getrheo/contracts/layers';
import { IconView, ImageView, LottieView, VideoView, primeLottieAnimationCache } from './mediaLayers';
import type { Ctx } from '../LayerRendererShared';

vi.mock('lottie-react', () => ({
  default: (props: { autoplay?: boolean; loop?: boolean }) =>
    createElement('motion-div', {
      'data-lottie': 'mock',
      'data-autoplay': String(props.autoplay ?? false),
      'data-loop': String(props.loop ?? false),
    }),
}));

vi.mock('react-icons/io5', () => ({
  IoStarOutline: () => createElement('span', { 'data-ion': 'star' }),
}));

const smokeCtx = (overrides?: Partial<Ctx>): Ctx => ({
  manifest: layerSmokeManifest(),
  screen: layerSmokeScreen('scr_sm_media'),
  locale: 'en',
  interactive: false,
  theme: 'dark',
  mediaMap: { 'asset-hero': 'https://example.com/hero.png' },
  ...overrides,
});

const findLayer = <T extends { id: string }>(layerId: string): T => {
  const body = layerSmokeScreen('scr_sm_media').regions.body;
  if (!body || body.kind !== 'stack') throw new Error('expected stack body');
  const layer = body.children.find((c) => c.id === layerId);
  if (!layer) throw new Error(`layer ${layerId} missing`);
  return layer as unknown as T;
};

describe('mediaLayers SSR smoke', () => {
  it('renders ImageView with img and alt when media is mapped', () => {
    const layer: ImageLayer = {
      ...findLayer<ImageLayer>('lyr_sm_img'),
      media: { mediaAssetId: 'asset-hero' },
    };
    const html = renderToStaticMarkup(createElement(ImageView, { layer, ctx: smokeCtx() }));
    expect(html).toContain('<img');
    expect(html).toContain('alt="Hero"');
    expect(html).not.toContain('#18181b');
    expect(html).not.toContain('#f4f4f5');
  });

  it('ImageView uses placeholder fill only when media is missing', () => {
    const layer = findLayer<ImageLayer>('lyr_sm_img');
    const html = renderToStaticMarkup(createElement(ImageView, { layer, ctx: smokeCtx() }));
    expect(html).toContain('#18181b');
    expect(html).not.toContain('<img');
  });

  it('ImageView does not apply implicit border-radius 10 without authored radius', () => {
    const layer: ImageLayer = {
      ...findLayer<ImageLayer>('lyr_sm_img'),
      media: { mediaAssetId: 'asset-hero' },
      style: { width: 120, height: 80 },
    };
    const html = renderToStaticMarkup(createElement(ImageView, { layer, ctx: smokeCtx() }));
    expect(html).not.toContain('border-radius:10px');
    expect(html).not.toContain('borderRadius:10');
  });

  it('ImageView applies authored radius', () => {
    const layer: ImageLayer = {
      ...findLayer<ImageLayer>('lyr_sm_img'),
      media: { mediaAssetId: 'asset-hero' },
      style: { width: 120, height: 80, radius: 16 },
    };
    const html = renderToStaticMarkup(createElement(ImageView, { layer, ctx: smokeCtx() }));
    expect(html).toContain('border-radius:16px');
  });

  it('ImageView respects explicit transparent background with media', () => {
    const layer: ImageLayer = {
      ...findLayer<ImageLayer>('lyr_sm_img'),
      media: { mediaAssetId: 'asset-hero' },
      style: { width: 120, height: 80, background: 'transparent' },
    };
    const html = renderToStaticMarkup(createElement(ImageView, { layer, ctx: smokeCtx() }));
    expect(html).toContain('background:transparent');
    expect(html).not.toContain('#18181b');
  });

  it('ImageView wraps img in inner fill surface and stretches chrome in a stack', () => {
    const layer: ImageLayer = {
      ...findLayer<ImageLayer>('lyr_sm_img'),
      media: { mediaAssetId: 'asset-hero' },
      style: { width: 'full', height: 'fill', fit: 'contain' },
    };
    const html = renderToStaticMarkup(
      createElement(ImageView, {
        layer,
        ctx: smokeCtx({ parentStackDirection: 'vertical' }),
      }),
    );
    const outer = html.match(/data-layer-id="lyr_sm_img" style="([^"]*)"/)?.[1] ?? '';
    expect(outer).toContain('flex:1');
    expect(outer).toContain('width:100%');
    expect(outer).toContain('height:100%');
    expect(html).toMatch(/<img[^>]*object-fit:contain/);
    expect(html).toMatch(/<img[^>]*width:100%/);
    expect(html).toMatch(/<img[^>]*height:100%/);
  });

  it('ImageView maps fit fill to object-fit fill inside stack child', () => {
    const layer: ImageLayer = {
      ...findLayer<ImageLayer>('lyr_sm_img'),
      media: { mediaAssetId: 'asset-hero' },
      style: { width: 'full', height: 160, fit: 'fill' },
    };
    const html = renderToStaticMarkup(
      createElement(ImageView, {
        layer,
        ctx: smokeCtx({ parentStackDirection: 'vertical' }),
      }),
    );
    expect(html).toMatch(/<img[^>]*object-fit:fill/);
  });

  it('renders IconView for ionicons', () => {
    const ion = findLayer<IconLayer>('lyr_sm_icon_i');
    const htmlIon = renderToStaticMarkup(createElement(IconView, { layer: ion, ctx: smokeCtx() }));
    expect(htmlIon).toContain('data-ion="star"');
  });

  it('renders LottieView placeholder without throwing when src is missing', () => {
    const layer = findLayer<LottieLayer>('lyr_sm_lottie');
    const html = renderToStaticMarkup(createElement(LottieView, { layer, ctx: smokeCtx() }));
    expect(html).toBeTruthy();
    expect(html.toLowerCase()).not.toContain('undefined');
  });

  it('LottieView outer chrome applies authored width=full and height=fill as 100%/100%', () => {
    // After the shell-model port, the inner chrome owns explicit
    // width/height when *not* in a parent stack; flex-flow handling lives
    // on the outer shell wrapper applied by LayerRenderer.
    const layer: LottieLayer = {
      ...findLayer<LottieLayer>('lyr_sm_lottie'),
      style: { width: 'full', height: 'fill' },
    };
    const html = renderToStaticMarkup(createElement(LottieView, { layer, ctx: smokeCtx() }));
    expect(html).toContain('width:100%');
    expect(html).toContain('height:100%');
  });

  it('LottieView outer chrome respects authored auto width / fill height', () => {
    const layer: LottieLayer = {
      ...findLayer<LottieLayer>('lyr_sm_lottie'),
      style: { width: 'auto', height: 'fill' },
    };
    const html = renderToStaticMarkup(createElement(LottieView, { layer, ctx: smokeCtx() }));
    const outer = html.match(/data-layer-id="lyr_sm_lottie" style="([^"]*)"/)?.[1] ?? '';
    expect(outer).toContain('width:auto');
    expect(outer).toContain('height:100%');
  });

  it('renders VideoView placeholder without throwing when src is missing', () => {
    const layer = findLayer<VideoLayer>('lyr_sm_video');
    const html = renderToStaticMarkup(createElement(VideoView, { layer, ctx: smokeCtx() }));
    expect(html).toBeTruthy();
    expect(html.toLowerCase()).not.toContain('undefined');
  });

  it('renders VideoView poster-only in authoring preview (no autoplay)', () => {
    const layer: VideoLayer = {
      ...findLayer<VideoLayer>('lyr_sm_video'),
      media: { mediaAssetId: 'asset-video' },
      audioEnabled: true,
    };
    const html = renderToStaticMarkup(
      createElement(VideoView, {
        layer,
        ctx: smokeCtx({
          authoringPreview: true,
          mediaMap: { 'asset-video': 'https://example.com/clip.mp4' },
        }),
      }),
    );
    expect(html).toContain('<video');
    expect(html).toContain('muted');
    expect(html).not.toContain('autoPlay');
    expect(html).toContain('preload="metadata"');
  });

  it('renders VideoView with muted autoplay video when media is mapped', () => {
    const layer: VideoLayer = {
      ...findLayer<VideoLayer>('lyr_sm_video'),
      media: { mediaAssetId: 'asset-video' },
    };
    const html = renderToStaticMarkup(
      createElement(VideoView, {
        layer,
        ctx: smokeCtx({ mediaMap: { 'asset-video': 'https://example.com/clip.mp4' } }),
      }),
    );
    expect(html).toContain('<video');
    expect(html).toContain('muted');
    expect(html).toContain('https://example.com/clip.mp4');
  });

  it('renders LottieView poster-only in authoring preview (no autoplay)', () => {
    const url = 'https://example.com/anim.json';
    primeLottieAnimationCache(url, { v: '5.7.4', fr: 30, ip: 0, op: 90, w: 100, h: 100, layers: [] });
    const layer: LottieLayer = {
      ...findLayer<LottieLayer>('lyr_sm_lottie'),
      media: { mediaAssetId: 'asset-lottie' },
      autoPlay: true,
      loop: true,
    };
    const html = renderToStaticMarkup(
      createElement(LottieView, {
        layer,
        ctx: smokeCtx({
          authoringPreview: true,
          mediaMap: { 'asset-lottie': url },
        }),
      }),
    );
    expect(html).toContain('data-lottie="mock"');
    expect(html).toContain('data-autoplay="false"');
    expect(html).toContain('data-loop="false"');
  });

  it('LottieView uses a transparent empty loader while JSON is pending', () => {
    const layer: LottieLayer = {
      ...findLayer<LottieLayer>('lyr_sm_lottie'),
      media: { mediaAssetId: 'asset-lottie-pending' },
    };
    const html = renderToStaticMarkup(
      createElement(LottieView, {
        layer,
        ctx: smokeCtx({
          mediaMap: { 'asset-lottie-pending': 'https://example.com/anim-pending.json' },
        }),
      }),
    );
    expect(html).not.toContain('Loading');
    expect(html).toContain('background:transparent');
    expect(html).not.toContain('#18181b');
    expect(html).not.toContain('#f4f4f5');
  });

  it('ImageView chrome fills motion shell for full/fill in a parent stack', () => {
    const layer: ImageLayer = {
      ...findLayer<ImageLayer>('lyr_sm_img'),
      media: { mediaAssetId: 'asset-hero' },
      style: { width: 'full', height: 'fill' },
    };
    const html = renderToStaticMarkup(
      createElement(ImageView, {
        layer,
        ctx: smokeCtx({ parentStackDirection: 'vertical' }),
      }),
    );
    expect(html).toContain('flex:1');
    expect(html).toContain('width:100%');
    expect(html).toContain('height:100%');
  });

  it('ImageView hug/hug uses intrinsic img size without object-fit', () => {
    const layer: ImageLayer = {
      ...findLayer<ImageLayer>('lyr_sm_img'),
      media: { mediaAssetId: 'asset-hero' },
      style: { width: 'auto', height: 'auto' },
    };
    const html = renderToStaticMarkup(
      createElement(ImageView, {
        layer,
        ctx: smokeCtx({ parentStackDirection: 'vertical' }),
      }),
    );
    expect(html).toContain('<img');
    expect(html).not.toContain('object-fit');
  });

  it('ImageView with contain fit and fixed size fills chrome', () => {
    const layer: ImageLayer = {
      ...findLayer<ImageLayer>('lyr_sm_img'),
      media: { mediaAssetId: 'asset-hero' },
      style: { width: 120, height: 80, fit: 'contain' },
    };
    const html = renderToStaticMarkup(createElement(ImageView, { layer, ctx: smokeCtx() }));
    expect(html).toContain('object-fit:contain');
    expect(html).toContain('width:100%');
    expect(html).toContain('height:100%');
  });

  it('LottieView and VideoView chrome fill motion shell in a parent stack', () => {
    const lottie: LottieLayer = {
      ...findLayer<LottieLayer>('lyr_sm_lottie'),
      style: { width: 'full', height: 'fill' },
    };
    const video: VideoLayer = {
      ...findLayer<VideoLayer>('lyr_sm_video'),
      style: { width: 'full', height: 'fill' },
    };
    const lottieHtml = renderToStaticMarkup(
      createElement(LottieView, {
        layer: lottie,
        ctx: smokeCtx({ parentStackDirection: 'vertical' }),
      }),
    );
    const videoHtml = renderToStaticMarkup(
      createElement(VideoView, {
        layer: video,
        ctx: smokeCtx({ parentStackDirection: 'horizontal' }),
      }),
    );
    expect(lottieHtml).toContain('flex:1');
    expect(videoHtml).toContain('flex:1');
  });
});
