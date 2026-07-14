import { FIELD_KEY_RE } from '@getrheo/contracts/fields';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import type { LocalizedText } from '@getrheo/contracts/localized';
import { resolveLocalizedText } from '@getrheo/contracts/localized';
import { choiceOptionLabel, findInputLayer } from './layers';
import type { StepResponse } from './stateMachine';

/** Runtime substitution for Text layer copy (after locale resolution). */
export type InterpolationRuntimeContext = {
  manifest: FlowManifest;
  locale: string;
  responses: Record<string, StepResponse>;
  customProperties?: Record<string, string>;
};

/** Props-sized slice passed into renderers. */
export type InterpolationContext = {
  responses: Record<string, StepResponse>;
  customProperties?: Record<string, string>;
  /** When true, the flow has a prior step so back navigation is available. */
  canGoBack?: boolean;
};

export const extractLiquidTemplateBodies = (s: string): string[] => {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf('{{', i);
    if (open === -1) break;
    const close = s.indexOf('}}', open + 2);
    if (close === -1) break;
    out.push(s.slice(open + 2, close));
    i = close + 2;
  }
  return out;
};

const FIELD_KEY_SOURCE = FIELD_KEY_RE.source.replace(/^\^|\$$/g, '');

const parseDefaultFilter = (
  inner: string,
): { exprPart: string; defaultValue?: string } => {
  const m = inner.match(/\s*\|\s*default\s*:/i);
  if (!m || m.index === undefined) return { exprPart: inner.trim() };

  const exprPart = inner.slice(0, m.index).trim();
  let tail = inner.slice(m.index + m[0].length).trim();
  if (tail.startsWith('"')) {
    const end = tail.indexOf('"', 1);
    if (end > 0) tail = tail.slice(1, end);
    else tail = tail.slice(1);
  }
  return { exprPart, defaultValue: tail };
};

const parseExpression = (
  exprRaw: string,
):
  | { kind: 'custom'; key: string }
  | { kind: 'field'; fieldKey: string; mode: 'label' | 'id' }
  | { kind: 'invalid' } => {
  const expr = exprRaw.trim();
  const customM = expr.match(new RegExp(`^custom\\.(${FIELD_KEY_SOURCE})$`));
  if (customM) return { kind: 'custom', key: customM[1]! };

  const idM = expr.match(new RegExp(`^(${FIELD_KEY_SOURCE})\\.id$`));
  if (idM) return { kind: 'field', fieldKey: idM[1]!, mode: 'id' };

  const plainM = expr.match(new RegExp(`^(${FIELD_KEY_SOURCE})$`));
  if (plainM) return { kind: 'field', fieldKey: plainM[1]!, mode: 'label' };

  return { kind: 'invalid' };
};

export type InterpolationExprAnalysis =
  | { kind: 'custom'; key: string }
  | { kind: 'field'; fieldKey: string; mode: 'label' | 'id' }
  | { kind: 'invalid' };

/** Parse one `{{ … }}` inner (after stripping delimiters) for diagnostics / validation. */
export const analyzeLiquidTemplateInner = (
  inner: string,
): { expr: InterpolationExprAnalysis; defaultValue?: string } => {
  const { exprPart, defaultValue } = parseDefaultFilter(inner);
  const p = parseExpression(exprPart);
  if (p.kind === 'invalid') return { expr: { kind: 'invalid' }, defaultValue };
  if (p.kind === 'custom') return { expr: { kind: 'custom', key: p.key }, defaultValue };
  return { expr: { kind: 'field', fieldKey: p.fieldKey, mode: p.mode }, defaultValue };
};

const findInputOwner = (
  manifest: FlowManifest,
  fieldKey: string,
): { screen: Screen; input: NonNullable<ReturnType<typeof findInputLayer>> } | null => {
  for (const screen of manifest.screens) {
    const input = findInputLayer(screen as Screen);
    if (input && input.fieldKey === fieldKey) return { screen: screen as Screen, input };
  }
  return null;
};

const choiceLabelFor = (
  manifest: FlowManifest,
  fieldKey: string,
  choiceId: string,
  locale: string,
): string => {
  const owner = findInputOwner(manifest, fieldKey);
  if (!owner) return '';
  const { input } = owner;
  if (input.kind !== 'single_choice' && input.kind !== 'multiple_choice') return '';
  return choiceOptionLabel(input, choiceId, locale);
};

const responseToDisplayString = (
  manifest: FlowManifest,
  fieldKey: string,
  response: StepResponse | undefined,
  mode: 'label' | 'id',
  locale: string,
): string => {
  if (!response) return '';
  switch (response.kind) {
    case 'text':
      return mode === 'id' ? '' : response.value;
    case 'scale':
      return mode === 'id' ? '' : String(response.value);
    case 'wheel':
      return mode === 'id' ? '' : response.value;
    case 'choice':
      if (mode === 'id') return response.choiceId;
      return choiceLabelFor(manifest, fieldKey, response.choiceId, locale);
    case 'multiChoice':
      if (mode === 'id') return response.choiceIds.join(', ');
      return response.choiceIds
        .map((id) => choiceLabelFor(manifest, fieldKey, id, locale))
        .filter(Boolean)
        .join(', ');
    case 'checkbox':
      return mode === 'id' ? '' : response.value ? 'true' : 'false';
    case 'bypass_input':
      return '';
    default:
      return '';
  }
};

const evalParsed = (
  parsed:
    | { kind: 'custom'; key: string }
    | { kind: 'field'; fieldKey: string; mode: 'label' | 'id' }
    | { kind: 'invalid' },
  ctx: InterpolationRuntimeContext,
): string => {
  if (parsed.kind === 'invalid') return '';
  if (parsed.kind === 'custom') {
    const v = ctx.customProperties?.[parsed.key];
    return v === undefined || v === '' ? '' : String(v);
  }
  const owner = findInputOwner(ctx.manifest, parsed.fieldKey);
  const r = ctx.responses[parsed.fieldKey];
  if (parsed.mode === 'id' && owner && owner.input.kind !== 'single_choice' && owner.input.kind !== 'multiple_choice') {
    return '';
  }
  return responseToDisplayString(ctx.manifest, parsed.fieldKey, r, parsed.mode, ctx.locale);
};

/**
 * Interpolate `{{ … }}` segments in a plain string (already localized).
 * Supports `custom.key`, `field_key`, `field_key.id`, and `| default: …`.
 */
export const interpolateTemplateString = (
  template: string,
  ctx: InterpolationRuntimeContext,
): string => {
  let i = 0;
  let out = '';
  while (i < template.length) {
    const open = template.indexOf('{{', i);
    if (open === -1) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, open);
    const close = template.indexOf('}}', open + 2);
    if (close === -1) {
      out += template.slice(open);
      break;
    }
    const inner = template.slice(open + 2, close);
    const { exprPart, defaultValue } = parseDefaultFilter(inner);
    const parsed = parseExpression(exprPart);
    let value = evalParsed(parsed, ctx);
    if ((value === '' || value === undefined) && defaultValue !== undefined) {
      value = defaultValue;
    }
    out += value;
    i = close + 2;
  }
  return out;
};

export const resolveAndInterpolateLocalizedText = (
  text: LocalizedText,
  ctx: InterpolationRuntimeContext,
): string => {
  const localized = resolveLocalizedText(text, ctx.locale);
  return interpolateTemplateString(localized, ctx);
};
