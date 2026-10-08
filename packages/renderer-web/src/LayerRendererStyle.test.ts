import { describe, expect, it } from 'vitest';
import {
  commonCss,
  flowChildLayoutCss,
  fillOuterStyleForHeight,
  mediaChromeFillsMotionShell,
  buttonChromeLayoutStyle,
  parentAlignUsesCrossAxisStretch,
  stackFillOuterStyle,
  stripCommonLayoutForInner,
  stripFlowAxesForFlexChild,
  textCss,
  wrapperLayoutCssFromResolvedCommon,
} from './LayerRendererStyle';

describe('LayerRendererStyle', () => {
  it('wrapperLayoutCssFromResolvedCommon applies authored rotation', () => {
    expect(wrapperLayoutCssFromResolvedCommon({ rotate: 15 })).toEqual({
      transform: 'rotate(15deg)',
    });
  });

  it('commonCss emits authored size clamps', () => {
    expect(commonCss({ maxWidth: 100, minHeight: 24 }, undefined, 'light')).toMatchObject({
      maxWidth: 100,
      minHeight: 24,
    });
  });

  it('stripCommonLayoutForInner omits rotate', () => {
    expect(
      stripCommonLayoutForInner({
        rotate: 90,
        margin: { t: 8 },
      }),
    ).toEqual({ margin: { t: 8 } });
  });

  describe('stripFlowAxesForFlexChild', () => {
    it('removes width and height when child is in a parent stack', () => {
      expect(
        stripFlowAxesForFlexChild(
          {
            width: 'full',
            height: 'fill',
            maxWidth: 100,
            minHeight: 40,
            padding: { t: 1, r: 1, b: 1, l: 1 },
          },
          'horizontal',
        ),
      ).toEqual({ padding: { t: 1, r: 1, b: 1, l: 1 } });
    });

    it('keeps width and height for absolute layers', () => {
      expect(
        stripFlowAxesForFlexChild(
          { position: 'absolute', width: 'full', height: 100 },
          'vertical',
        ),
      ).toEqual({ position: 'absolute', width: 'full', height: 100 });
    });

    it('returns the input unchanged when there is no parent stack', () => {
      const style = { width: 'full' as const, padding: { t: 1, r: 1, b: 1, l: 1 } };
      expect(stripFlowAxesForFlexChild(style, undefined)).toBe(style);
    });
  });

  describe('flowChildLayoutCss', () => {
    it('uses flex longhand in a horizontal stack when width is full', () => {
      expect(flowChildLayoutCss({ width: 'full' }, 'horizontal')).toMatchObject({
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minWidth: 0,
      });
      expect(flowChildLayoutCss({ width: 'full' }, 'horizontal').alignSelf).toBeUndefined();
    });

    it('does not cross-stretch width:full children when parent align is center', () => {
      expect(flowChildLayoutCss({ width: 'full' }, 'horizontal', 'center').alignSelf).toBeUndefined();
    });

    it('uses width:100% in a vertical stack', () => {
      expect(flowChildLayoutCss({ width: 'full' }, 'vertical')).toMatchObject({
        width: '100%',
        alignSelf: 'stretch',
      });
    });

    it('applies main-axis flex grow when height is fill in a vertical stack', () => {
      expect(flowChildLayoutCss({ height: 'fill' }, 'vertical')).toMatchObject({
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0,
        height: '100%',
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
      });
    });

    it('uses cross-axis stretch only when height is fill in a horizontal stack', () => {
      const css = flowChildLayoutCss({ height: 'fill' }, 'horizontal');
      expect(css).toMatchObject({
        alignSelf: 'stretch',
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      });
      expect(css.flexGrow).toBeUndefined();
      expect(css.flexShrink).toBeUndefined();
    });

    it('parentAlignUsesCrossAxisStretch defaults to stretch semantics', () => {
      expect(parentAlignUsesCrossAxisStretch(undefined)).toBe(true);
      expect(parentAlignUsesCrossAxisStretch('stretch')).toBe(true);
      expect(parentAlignUsesCrossAxisStretch('center')).toBe(false);
    });

    it('applies fractional height inside a parent stack', () => {
      expect(flowChildLayoutCss({ width: 'full', height: '1/2' }, 'vertical')).toMatchObject({
        width: '100%',
        height: '50%',
      });
    });

    it('applies pixel height inside a parent stack', () => {
      expect(flowChildLayoutCss({ width: 120, height: 88 }, 'vertical')).toMatchObject({
        width: 120,
        height: 88,
      });
    });

    it('emits authored maxWidth on a flex child shell', () => {
      expect(
        flowChildLayoutCss({ width: 'full', maxWidth: 100 }, 'horizontal'),
      ).toMatchObject({
        flexGrow: 1,
        maxWidth: 100,
      });
    });

    it('returns no flex layout for absolute layers', () => {
      expect(
        flowChildLayoutCss({ position: 'absolute', width: 'full' }, 'horizontal'),
      ).toEqual({});
    });

    it('still applies height fill when there is no parent stack', () => {
      // Cross-axis fill works regardless of parent direction (matches RN).
      expect(flowChildLayoutCss({ height: 'fill' }, undefined)).toMatchObject({
        height: '100%',
        flexGrow: 1,
      });
    });
  });

  describe('fillOuterStyleForHeight', () => {
    it('returns flex fill bridge for fill height without forcing column', () => {
      expect(fillOuterStyleForHeight('fill')).toEqual({
        flex: 1,
        minHeight: 0,
        alignSelf: 'stretch',
        display: 'flex',
      });
      expect(stackFillOuterStyle({ height: 'full' })).toEqual(fillOuterStyleForHeight('full'));
    });

    it('returns undefined for hug height', () => {
      expect(fillOuterStyleForHeight('auto')).toBeUndefined();
      expect(stackFillOuterStyle({ height: 'auto' })).toBeUndefined();
    });
  });

  describe('mediaChromeFillsMotionShell', () => {
    it('stretches chrome when authored size is explicit inside a stack', () => {
      expect(mediaChromeFillsMotionShell({ width: 120, height: 120 }, 'vertical')).toMatchObject({
        width: 120,
        height: 120,
        minHeight: 120,
        minWidth: 120,
        flexShrink: 0,
      });
      expect(mediaChromeFillsMotionShell({ width: 120, height: 120 }, 'vertical').flex).toBeUndefined();
    });

    it('returns empty when both axes hug', () => {
      expect(mediaChromeFillsMotionShell({ width: 'auto', height: 'auto' }, 'vertical')).toEqual({});
    });

    it('returns empty when there is no parent stack', () => {
      expect(mediaChromeFillsMotionShell({ width: 'full', height: 'fill' }, undefined)).toEqual({});
    });
  });

  describe('buttonChromeLayoutStyle', () => {
    it('hugs main axis in a horizontal stack when width is auto/undefined', () => {
      expect(buttonChromeLayoutStyle(undefined, 'horizontal').width).toBeUndefined();
      expect(buttonChromeLayoutStyle({ width: 'auto' }, 'horizontal').width).toBeUndefined();
      expect(buttonChromeLayoutStyle({ width: 'full' }, 'horizontal').width).toBe('100%');
      expect(buttonChromeLayoutStyle({ width: 'full' }, 'vertical').width).toBe('100%');
    });
  });

  describe('textCss', () => {
    it('maps line height and letter spacing for text layers', () => {
      expect(
        textCss({ fontSize: 16, lineHeight: 1.5, letterSpacing: -0.02 }, undefined, 'light'),
      ).toMatchObject({
        fontSize: 16,
        lineHeight: 1.5,
        letterSpacing: '-0.02em',
        whiteSpace: 'pre-wrap',
      });
    });
  });

  describe('commonCss', () => {
    it('applies background opacity without dimming children via container opacity', () => {
      expect(
        commonCss({ background: '#ff0000', backgroundOpacity: 0.5 }, undefined, 'light'),
      ).toMatchObject({
        background: 'rgba(255,0,0,0.5)',
      });
      expect(
        commonCss({ background: '#ff0000', backgroundOpacity: 0.5 }, undefined, 'light').opacity,
      ).toBeUndefined();
    });

    it('treats legacy stack background opacity as background-only', () => {
      expect(
        commonCss({ background: '#ff0000', opacity: 0.5 }, undefined, 'light'),
      ).toMatchObject({
        background: 'rgba(255,0,0,0.5)',
      });
      expect(commonCss({ background: '#ff0000', opacity: 0.5 }, undefined, 'light').opacity).toBeUndefined();
    });
  });
});
