import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { regionWrapStyle, RegionLabelRow } from './LayerRendererRegions';

describe('LayerRendererRegions parity', () => {
  it('returns stable regionWrapStyle objects for header/body/footer', () => {
    const combos = (['header', 'body', 'footer'] as const).flatMap((kind) =>
      (['light', 'dark'] as const).flatMap((theme) =>
        [false, true].flatMap((showLabels) =>
          [undefined, true].map((intrinsicHeight) => ({
            kind,
            theme,
            showLabels,
            intrinsicHeight,
            style: regionWrapStyle(kind, theme, showLabels, intrinsicHeight),
          })),
        ),
      ),
    );
    expect(combos).toMatchSnapshot();
  });

  it('renders uppercase label badge markup', () => {
    const html = renderToStaticMarkup(
      createElement(RegionLabelRow, { label: 'Header', theme: 'dark' }),
    );
    expect(html.toLowerCase()).toContain('header');
    expect(html).toContain('text-transform:uppercase');
  });
});
