import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Layer } from '@getrheo/contracts/layers';
import { resolveLocalizedText } from '@getrheo/contracts/localized';
import { resolveAndInterpolateLocalizedText } from './interpolateTemplate';
import type { InterpolationContext } from './interpolateTemplate';

export type ResolveHyperlinkPreviewLabelArgs = {
  manifest: FlowManifest;
  locale: string;
  interpolationContext?: InterpolationContext;
};

/**
 * First resolved text substring under a hyperlink’s children (preview / dialogs / a11y).
 * Depth-first; ignores non-text subtrees until a Text layer is found.
 */
export const resolveHyperlinkPreviewLabel = (
  roots: Layer[],
  args: ResolveHyperlinkPreviewLabelArgs,
): string => {
  const { manifest, locale, interpolationContext } = args;
  let found = '';

  const visit = (l: Layer): void => {
    if (found) return;
    if (l.kind === 'text') {
      found = interpolationContext
        ? resolveAndInterpolateLocalizedText(l.text, {
            manifest,
            locale,
            responses: interpolationContext.responses,
            customProperties: interpolationContext.customProperties,
          })
        : resolveLocalizedText(l.text, locale);
      return;
    }
    if (l.kind === 'stack') {
      for (const c of l.children) visit(c);
      return;
    }
    if (l.kind === 'carousel') {
      for (const s of l.slides) visit(s);
      return;
    }
    if (l.kind === 'button' || l.kind === 'back_button') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'hyperlink') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'single_choice' || l.kind === 'multiple_choice') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'text_input' || l.kind === 'scale_input' || l.kind === 'wheel_picker') {
      l.children?.forEach(visit);
      return;
    }
    if (l.kind === 'oauth_login') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'oauth_provider' && l.variant === 'custom') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'email_password_auth') {
      l.children.forEach(visit);
      return;
    }
    if (l.kind === 'email_password_field') {
      l.children?.forEach(visit);
      return;
    }
    if (l.kind === 'email_password_submit') {
      l.children.forEach(visit);
      return;
    }
  };

  for (const r of roots) visit(r);
  return found;
};
