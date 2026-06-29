/**
 * Shared typography + font map decisions consumed by web and native renderers.
 * Re-exports pure helpers from {@link @getrheo/flow-runtime} so adapters import one surface.
 */
export {
  TEXT_FONT_FAMILY_SYSTEM_UI,
  WEB_DOCUMENT_FONT_STACK,
  brandingWebFontFacesCss,
  buildBrandingFontLoadMap,
  nativeFontRegistrationNameForStyle,
  resolveNativeTextFontFamilyName,
  resolveWebRootFontFamilyCss,
  resolveWebTextFontFamilyCss,
} from '@getrheo/flow-runtime/layerTypography';

/** Preview / builder breakpoint helpers shared by web and native render paths. */
export { getScreenSizeBucketForWidth, type ScreenSizeBucket } from '@getrheo/flow-runtime/responsive/breakpoints';

/** Checkbox render config normalization (parity surface for web + RN adapters). */
export { resolveCheckboxGlyphForRender } from '@getrheo/flow-runtime/checkboxGlyphStyle';

export * from './actionModel';
export * from './authModel';
export * from './carouselModel';
export * from './inputModel';
export * from './spacingModel';
export * from './surfaceModel';
export * from './typographyModel';
