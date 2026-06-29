import type { Branding } from '@getrheo/contracts/branding';
import type { Border, DropShadow, ThemedColor } from '@getrheo/contracts/layers';
import type { Theme } from '@getrheo/contracts/manifest';
import {
  dropShadowToBoxShadow,
  dropShadowToNativeStyle,
  nativeBrandBackgroundFromThemedColor,
  resolveThemedBackground,
  resolveThemedColor,
  type NativeDropShadowStyle,
} from '@getrheo/flow-runtime';
import type { RendererPalette } from './typographyModel';

export type RendererSurfaceModel = {
  radius: number | undefined;
  opacity: number | undefined;
  background: string | undefined;
  nativeBackgroundColor: string | undefined;
  borderWidth: number | undefined;
  borderColor: string | undefined;
  webBoxShadow: string | undefined;
  nativeShadow: NativeDropShadowStyle;
};

export const rendererSurfaceModel = ({
  style,
  theme,
  palette,
  branding,
}: {
  style:
    | {
        radius?: number;
        opacity?: number;
        background?: ThemedColor;
        border?: Border;
        shadow?: DropShadow;
      }
    | undefined;
  theme: Theme | undefined;
  palette: RendererPalette;
  branding?: Branding;
}): RendererSurfaceModel => {
  const nativeBackground = nativeBrandBackgroundFromThemedColor(
    theme,
    branding,
    palette,
    style?.background,
  );
  return {
    radius: style?.radius,
    opacity: style?.opacity,
    background: resolveThemedBackground(theme, branding, palette, style?.background),
    nativeBackgroundColor: nativeBackground.solid,
    borderWidth: style?.border?.width,
    borderColor: resolveThemedColor(theme, palette, style?.border?.color),
    webBoxShadow: dropShadowToBoxShadow(style?.shadow, theme, palette),
    nativeShadow: dropShadowToNativeStyle(style?.shadow, theme, palette),
  };
};
