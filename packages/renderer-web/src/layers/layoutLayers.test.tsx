import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Screen } from '@getrheo/contracts/screens';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import { LayerRenderer } from '../LayerRenderer';

const styleOf = (html: string, layerId: string): string => {
  const match = html.match(new RegExp(`data-layer-id="${layerId}"[^>]*style="([^"]*)"`));
  return match?.[1] ?? '';
};

const shellStyleOf = (html: string, layerId: string): string => {
  const match = html.match(new RegExp(`data-layer-shell="${layerId}"[^>]*style="([^"]*)"`));
  return match?.[1] ?? '';
};

const renderBody = (body: Screen['regions']['body']): string => {
  const manifest = validFlow();
  const screen: Screen = {
    id: 'scr_parity',
    name: 'Parity',
    next: { default: null },
    regions: { body },
  };
  return renderToStaticMarkup(
    <LayerRenderer
      manifest={{ ...manifest, screens: [screen], entryScreenId: screen.id }}
      screen={screen}
      mode="static"
      theme="dark"
    />,
  );
};

/** Matches `ScreenNode` canvas preview props (authoring + region labels). */
const renderBannerCanvasBody = (body: Screen['regions']['body']): string => {
  const manifest = validFlow();
  const screen: Screen = {
    id: 'scr_banner',
    name: 'Banner',
    next: { default: null },
    regions: { body },
  };
  return renderToStaticMarkup(
    <LayerRenderer
      manifest={{ ...manifest, screens: [screen], entryScreenId: screen.id }}
      screen={screen}
      mode="static"
      theme="dark"
      authoringPreview
      showRegionLabels
      intrinsicHeight
      previewWidthPx={390}
      motionMode="paused"
    />,
  );
};

const renderCanvasBody = (body: Screen['regions']['body']): string => {
  const manifest = validFlow();
  const screen: Screen = {
    id: 'scr_canvas',
    name: 'Canvas',
    next: { default: null },
    regions: { body },
  };
  return renderToStaticMarkup(
    <LayerRenderer
      manifest={{ ...manifest, screens: [screen], entryScreenId: screen.id }}
      screen={screen}
      mode="static"
      theme="dark"
      authoringPreview
      showRegionLabels
      previewWidthPx={393}
      motionMode="paused"
    />,
  );
};

describe('web StackView sizing parity', () => {
  it('keeps a real flex flow container and grows flow children when a descendant is absolute', () => {
    const html = renderBody({
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      children: [
        {
          id: 'lyr_split',
          kind: 'stack',
          direction: 'horizontal',
          distribution: 'between',
          style: { width: 'full', height: 'fill' },
          children: [
            {
              id: 'lyr_flowchild',
              kind: 'stack',
              direction: 'vertical',
              style: { width: 'full', height: 'fill' },
              children: [{ id: 'lyr_tap', kind: 'text', text: { default: 'tap' } }],
            },
            {
              id: 'lyr_abs',
              kind: 'text',
              text: { default: 'behind' },
              style: { position: 'absolute', inset: { t: 8 }, zIndex: -10 },
            },
          ],
        },
      ],
    });

    expect(html).toMatch(/style="[^"]*display:flex[^"]*z-index:0[^"]*"/);
    expect(shellStyleOf(html, 'lyr_flowchild')).toContain('flex-grow:1');
    expect(html).toContain('data-layer-id="lyr_abs"');
  });

  it('does not flex-grow a nested auto-height stack (hug wins)', () => {
    const html = renderBody({
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      children: [
        {
          id: 'lyr_nested_auto',
          kind: 'stack',
          direction: 'vertical',
          style: { width: 'full', height: 'auto' },
          children: [],
        },
      ],
    });
    const style = styleOf(html, 'lyr_nested_auto');
    expect(style).not.toContain('flex:1');
    expect(style).not.toContain('flex-grow:1');
  });

  it('flex-grows a nested stack when height is fill', () => {
    const html = renderBody({
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      children: [
        {
          id: 'lyr_nested_fill',
          kind: 'stack',
          direction: 'vertical',
          style: { width: 'full', height: 'fill' },
          children: [],
        },
      ],
    });
    expect(shellStyleOf(html, 'lyr_nested_fill')).toMatch(/flex(-grow)?:1/);
  });

  it('fills the body region root (flex:1) to match RN/SwiftUI', () => {
    const html = renderBody({
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      children: [{ id: 'lyr_only', kind: 'text', text: { default: 'hi' } }],
    });
    expect(styleOf(html, 'lyr_body')).toContain('flex:1');
  });

  it('sizes the body region root to content when intrinsicHeight is true (responsive banner)', () => {
    const html = renderBannerCanvasBody({
      id: 'lyr_banner_body',
      kind: 'stack',
      direction: 'vertical',
      gap: 8,
      style: { width: 'full', height: 'full', padding: { t: 12, r: 12, b: 12, l: 12 } },
      children: [
        { id: 'lyr_t1', kind: 'text', text: { default: 'One' } },
        { id: 'lyr_t2', kind: 'text', text: { default: 'Two' } },
        { id: 'lyr_t3', kind: 'text', text: { default: 'Three' } },
      ],
    });
    expect(styleOf(html, 'lyr_banner_body')).not.toContain('flex:1');
    expect(styleOf(html, 'lyr_banner_body')).not.toContain('height:100%');
    expect(html).not.toMatch(/overflow-y:auto/);
    expect(html).toContain('One');
    expect(html).toContain('Two');
    expect(html).toContain('Three');
  });

  it('keeps a horizontal banner stack from collapsing when an image has pixel height', () => {
    const html = renderBannerCanvasBody({
      id: 'lyr_banner_body',
      kind: 'stack',
      direction: 'horizontal',
      gap: 8,
      style: { width: 'full', height: 'full', padding: { t: 12, r: 12, b: 12, l: 12 } },
      children: [
        {
          id: 'lyr_copy',
          kind: 'text',
          text: { default: 'Edit me' },
          style: { width: 'auto', height: 'auto' },
        },
        {
          id: 'lyr_img',
          kind: 'image',
          alt: '',
          style: { width: 'full', height: 160, fit: 'cover' },
        },
      ],
    });
    expect(html).toContain('Edit me');
    expect(styleOf(html, 'lyr_banner_body')).toContain('flex-direction:row');
    expect(styleOf(html, 'lyr_img')).toContain('height:160px');
    expect(styleOf(html, 'lyr_img')).not.toContain('height:100%');
    expect(shellStyleOf(html, 'lyr_banner_body')).not.toContain('height:100%');
    expect(shellStyleOf(html, 'lyr_banner_body')).not.toMatch(/min-height:\s*0/);
  });

  it('flex-grows nested fill stacks under canvas preview props (authoring + region labels)', () => {
    const html = renderCanvasBody({
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      children: [
        {
          id: 'lyr_hug',
          kind: 'stack',
          direction: 'vertical',
          style: { width: 'full', height: 'auto' },
          children: [
            { id: 'lyr_title', kind: 'text', text: { default: 'Title' } },
          ],
        },
        {
          id: 'lyr_fill',
          kind: 'stack',
          direction: 'vertical',
          style: { width: 'full', height: 'fill' },
          children: [
            { id: 'lyr_inner', kind: 'text', text: { default: 'Fills' } },
          ],
        },
      ],
    });

    expect(html).toContain('Body');
    expect(shellStyleOf(html, 'lyr_fill')).toMatch(/flex(-grow)?:1/);
    const fillWrapStyle = styleOf(html, 'lyr_fill');
    expect(fillWrapStyle).toContain('flex:1');
    expect(fillWrapStyle).toContain('flex-direction:column');
  });

  it('emits stack align and distribution on the canvas body root (flow + banner)', () => {
    const html = renderCanvasBody({
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      align: 'center',
      distribution: 'center',
      style: { width: 'full', height: 'full' },
      children: [{ id: 'lyr_only', kind: 'text', text: { default: 'Hi' } }],
    });
    expect(styleOf(html, 'lyr_body')).toContain('align-items:center');
    expect(styleOf(html, 'lyr_body')).toContain('justify-content:center');
    expect(styleOf(html, 'lyr_body')).toContain('flex:1');
  });
});

describe('web TextView', () => {
  it('preserves line breaks from authored copy', () => {
    const html = renderCanvasBody({
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      children: [
        {
          id: 'lyr_title',
          kind: 'text',
          text: { default: 'Train\nSmarter' },
        },
      ],
    });

    expect(html).toContain('white-space:pre-wrap');
    expect(html).toContain('Train\nSmarter');
  });
});
