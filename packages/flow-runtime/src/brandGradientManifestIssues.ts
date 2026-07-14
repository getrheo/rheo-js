import type { Branding } from '@getrheo/contracts/branding';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import type {
  CarouselPageControl,
  CheckboxGlyphStyle,
  CommonStyle,
  Layer,
  TextStyle,
  ThemedColor,
} from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';
import type { ManifestValidationIssue } from './validation';
import { isBrandGradientToken, isStoredLinearGradientCss, resolveBrandGradientToken } from './brandGradient';
import { walkScreen } from './layers';

const BP_KEYS = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

const themedStrings = (tc: ThemedColor | undefined): string[] => {
  if (tc === undefined) return [];
  if (typeof tc === 'string') return [tc];
  const out: string[] = [];
  if (tc.light !== undefined) out.push(tc.light);
  if (tc.dark !== undefined) out.push(tc.dark);
  return out;
};

const pushIssue = (
  issues: ManifestValidationIssue[],
  stepId: string,
  layerId: string,
  field: string,
  message: string,
  code: string,
): void => {
  issues.push({
    stepId,
    path: ['screens', stepId, layerId, field],
    message,
    code,
  });
};

const checkThemed = (
  issues: ManifestValidationIssue[],
  stepId: string,
  layerId: string,
  field: string,
  tc: ThemedColor | undefined,
  allowGradient: boolean,
  branding: Branding | undefined,
): void => {
  for (const s of themedStrings(tc)) {
    if (isBrandGradientToken(s)) {
      if (!allowGradient) {
        pushIssue(
          issues,
          stepId,
          layerId,
          field,
          `Brand gradient presets can only be used on background fills (not ${field}).`,
          'brand_gradient.disallowed_field',
        );
        return;
      }
      if (branding !== undefined && resolveBrandGradientToken(branding, s) === undefined) {
        pushIssue(
          issues,
          stepId,
          layerId,
          field,
          `Brand gradient preset not found: ${s}`,
          'brand_gradient.unknown_preset',
        );
      }
      continue;
    }
    if (isStoredLinearGradientCss(s)) {
      if (!allowGradient) {
        pushIssue(
          issues,
          stepId,
          layerId,
          field,
          `CSS linear gradients can only be used on background fills in v1 (not ${field}).`,
          'brand_gradient.linear_css_disallowed_field',
        );
        return;
      }
    }
  }
};

const checkCommon = (
  issues: ManifestValidationIssue[],
  stepId: string,
  layerId: string,
  fieldPrefix: string,
  s: CommonStyle | undefined,
  branding: Branding | undefined,
): void => {
  if (!s) return;
  checkThemed(issues, stepId, layerId, `${fieldPrefix}background`, s.background, true, branding);
  checkThemed(issues, stepId, layerId, `${fieldPrefix}border.color`, s.border?.color, false, branding);
  checkThemed(issues, stepId, layerId, `${fieldPrefix}shadow.color`, s.shadow?.color, false, branding);
};

const checkTextLike = (
  issues: ManifestValidationIssue[],
  stepId: string,
  layerId: string,
  fieldPrefix: string,
  s: TextStyle | undefined,
  branding: Branding | undefined,
): void => {
  if (!s) return;
  checkCommon(issues, stepId, layerId, fieldPrefix, s, branding);
  checkThemed(issues, stepId, layerId, `${fieldPrefix}color`, s.color, false, branding);
};

const walkCommonBreakpoints = (
  issues: ManifestValidationIssue[],
  stepId: string,
  layerId: string,
  base: CommonStyle | undefined,
  breakpoints:
    | Partial<Record<(typeof BP_KEYS)[number], Partial<CommonStyle> | undefined>>
    | undefined,
  branding: Branding | undefined,
): void => {
  checkCommon(issues, stepId, layerId, 'style.', base, branding);
  if (!breakpoints) return;
  for (const k of BP_KEYS) {
    const patch = breakpoints[k];
    if (patch) checkCommon(issues, stepId, layerId, `styleBreakpoints.${k}.`, patch, branding);
  }
};

const walkTextBreakpoints = (
  issues: ManifestValidationIssue[],
  stepId: string,
  layerId: string,
  base: TextStyle | undefined,
  breakpoints:
    | Partial<Record<(typeof BP_KEYS)[number], Partial<TextStyle> | undefined>>
    | undefined,
  branding: Branding | undefined,
): void => {
  checkTextLike(issues, stepId, layerId, 'style.', base, branding);
  if (!breakpoints) return;
  for (const k of BP_KEYS) {
    const patch = breakpoints[k];
    if (patch) checkTextLike(issues, stepId, layerId, `styleBreakpoints.${k}.`, patch, branding);
  }
};

const checkCheckboxGlyph = (
  issues: ManifestValidationIssue[],
  stepId: string,
  layerId: string,
  suffix: string,
  g: CheckboxGlyphStyle | undefined,
  branding: Branding | undefined,
): void => {
  if (!g) return;
  const p = suffix ? `${suffix}.` : '';
  checkThemed(issues, stepId, layerId, `${p}background`, g.background, true, branding);
  checkThemed(issues, stepId, layerId, `${p}border.color`, g.border?.color, false, branding);
  checkThemed(issues, stepId, layerId, `${p}shadow.color`, g.shadow?.color, false, branding);
  checkThemed(issues, stepId, layerId, `${p}checkColor`, g.checkColor, false, branding);
};

const checkCarouselPageControl = (
  issues: ManifestValidationIssue[],
  stepId: string,
  layerId: string,
  pc: CarouselPageControl | undefined,
  branding: Branding | undefined,
): void => {
  if (!pc) return;
  const ind = pc.indicators;
  if (ind) {
    checkThemed(issues, stepId, layerId, 'pageControl.indicators.defaultColor', ind.defaultColor, false, branding);
    checkThemed(issues, stepId, layerId, 'pageControl.indicators.activeColor', ind.activeColor, false, branding);
    checkThemed(issues, stepId, layerId, 'pageControl.indicators.border.color', ind.border?.color, false, branding);
    checkThemed(
      issues,
      stepId,
      layerId,
      'pageControl.indicators.activeBorder.color',
      ind.activeBorder?.color,
      false,
      branding,
    );
  }
  checkThemed(issues, stepId, layerId, 'pageControl.border.color', pc.border?.color, false, branding);
  checkThemed(issues, stepId, layerId, 'pageControl.shadow.color', pc.shadow?.color, false, branding);
};

const scanLayer = (issues: ManifestValidationIssue[], screen: Screen, layer: Layer, branding: Branding | undefined) => {
  const stepId = screen.id;
  const id = layer.id;

  switch (layer.kind) {
    case 'stack':
      walkCommonBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      checkCommon(issues, stepId, id, 'selectedStyle.', layer.selectedStyle, branding);
      return;
    case 'text':
      walkTextBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      return;
    case 'image':
      walkCommonBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      return;
    case 'lottie':
    case 'video':
      walkCommonBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      return;
    case 'icon': {
      const base = layer.style;
      checkCommon(issues, stepId, id, 'style.', base, branding);
      checkThemed(issues, stepId, id, 'style.color', base?.color, false, branding);
      const bp = layer.styleBreakpoints;
      if (bp) {
        for (const k of BP_KEYS) {
          const patch = bp[k];
          if (!patch) continue;
          checkCommon(issues, stepId, id, `styleBreakpoints.${k}.`, patch, branding);
          checkThemed(issues, stepId, id, `styleBreakpoints.${k}.color`, patch.color, false, branding);
        }
      }
      return;
    }
    case 'button':
    case 'back_button': {
      const base = layer.style;
      checkTextLike(issues, stepId, id, 'style.', base, branding);
      const bp = layer.styleBreakpoints;
      if (bp) {
        for (const k of BP_KEYS) {
          const patch = bp[k];
          if (patch) checkTextLike(issues, stepId, id, `styleBreakpoints.${k}.`, patch, branding);
        }
      }
      return;
    }
    case 'hyperlink':
      walkCommonBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      return;
    case 'progress':
      checkCommon(issues, stepId, id, 'style.', layer.style, branding);
      checkThemed(issues, stepId, id, 'trackColor', layer.trackColor, false, branding);
      checkThemed(issues, stepId, id, 'fillColor', layer.fillColor, false, branding);
      return;
    case 'loader':
      checkCommon(issues, stepId, id, 'style.', layer.style, branding);
      checkThemed(issues, stepId, id, 'trackColor', layer.trackColor, false, branding);
      checkThemed(issues, stepId, id, 'fillColor', layer.fillColor, false, branding);
      return;
    case 'counter':
      walkTextBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      return;
    case 'checkbox':
      checkCheckboxGlyph(issues, stepId, id, 'uncheckedStyle', layer.uncheckedStyle, branding);
      checkCheckboxGlyph(issues, stepId, id, 'checkedStyle', layer.checkedStyle, branding);
      return;
    case 'carousel':
      walkCommonBreakpoints(issues, stepId, id, layer.style, undefined, branding);
      checkCarouselPageControl(issues, stepId, id, layer.pageControl, branding);
      return;
    case 'single_choice':
    case 'multiple_choice':
      return;
    case 'text_input':
      walkCommonBreakpoints(issues, stepId, id, layer.style, undefined, branding);
      return;
    case 'scale_input':
      walkCommonBreakpoints(issues, stepId, id, layer.style, undefined, branding);
      checkThemed(issues, stepId, id, 'labelStyle.color', layer.labelStyle?.color, false, branding);
      checkThemed(issues, stepId, id, 'valueStyle.color', layer.valueStyle?.color, false, branding);
      checkThemed(issues, stepId, id, 'trackColor', layer.trackColor, false, branding);
      checkThemed(issues, stepId, id, 'fillColor', layer.fillColor, false, branding);
      checkThemed(issues, stepId, id, 'thumbColor', layer.thumbColor, false, branding);
      return;
    case 'wheel_picker':
      walkCommonBreakpoints(issues, stepId, id, layer.style, undefined, branding);
      checkThemed(
        issues,
        stepId,
        id,
        'selectionBackgroundColor',
        layer.selectionBackgroundColor,
        false,
        branding,
      );
      checkThemed(issues, stepId, id, 'itemStyle.color', layer.itemStyle?.color, false, branding);
      checkThemed(
        issues,
        stepId,
        id,
        'selectedItemStyle.color',
        layer.selectedItemStyle?.color,
        false,
        branding,
      );
      return;
    case 'oauth_login':
      walkCommonBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      return;
    case 'oauth_provider':
      if (layer.variant === 'preset') {
        walkCommonBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      } else {
        const base = layer.style;
        checkTextLike(issues, stepId, id, 'style.', base, branding);
        const bp = layer.styleBreakpoints;
        if (bp) {
          for (const k of BP_KEYS) {
            const patch = bp[k];
            if (patch) checkTextLike(issues, stepId, id, `styleBreakpoints.${k}.`, patch, branding);
          }
        }
      }
      return;
    case 'email_password_auth':
      walkCommonBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      return;
    case 'email_password_field':
      walkCommonBreakpoints(issues, stepId, id, layer.style, layer.styleBreakpoints, branding);
      return;
    case 'email_password_submit': {
      const base = layer.style;
      checkTextLike(issues, stepId, id, 'style.', base, branding);
      const bp = layer.styleBreakpoints;
      if (bp) {
        for (const k of BP_KEYS) {
          const patch = bp[k];
          if (patch) checkTextLike(issues, stepId, id, `styleBreakpoints.${k}.`, patch, branding);
        }
      }
      return;
    }
    default:
      return;
  }
};

/**
 * Non-schema checks: `$brandGradient:` is only valid on background-like fields; optional unknown-id check when `branding` is set.
 */
export const collectBrandGradientManifestIssues = (
  manifest: FlowManifest,
  branding: Branding | undefined,
): ManifestValidationIssue[] => {
  const issues: ManifestValidationIssue[] = [];
  for (const screen of manifest.screens) {
    walkScreen(screen as Screen, (layer) => scanLayer(issues, screen as Screen, layer, branding));
  }
  return issues;
};
