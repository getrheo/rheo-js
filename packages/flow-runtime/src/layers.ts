import type { Branding } from '@getrheo/contracts/branding';
import type { FlowManifest, Theme } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import {
  brandGradientFromThemedColor,
  brandGradientNativeLinear,
  brandGradientSolidFallback,
  isStoredLinearGradientCss,
  nativeLinearFromAngleAndStops,
  parseLinearGradientCss,
  resolveBrandGradientToken,
  type BrandGradientNativeLinear,
} from './brandGradient';
import type {
  InputLayer,
  Layer,
  MultipleChoiceLayer,
  ScaleInputLayer,
  SingleChoiceLayer,
  StackLayer,
  TextInputLayer,
  ThemedColor,
} from '@getrheo/contracts/layers';
import type { LocalizedText } from '@getrheo/contracts/localized';
import { resolveLocalizedText } from '@getrheo/contracts/localized';
import { isInputLayer } from '@getrheo/contracts/layers';

/** Walk a layer tree depth-first. */
export const walkLayers = (root: Layer, fn: (l: Layer, depth: number) => void): void => {
  const visit = (l: Layer, depth: number): void => {
    fn(l, depth);
    if (l.kind === 'stack') l.children.forEach((c) => visit(c, depth + 1));
    else if (l.kind === 'carousel') l.slides.forEach((c) => visit(c, depth + 1));
    else if (l.kind === 'button') l.children.forEach((c) => visit(c, depth + 1));
    else if (l.kind === 'back_button') l.children.forEach((c) => visit(c, depth + 1));
    else if (l.kind === 'hyperlink') l.children.forEach((c) => visit(c, depth + 1));
    else if (l.kind === 'single_choice' || l.kind === 'multiple_choice') {
      l.children.forEach((c) => visit(c, depth + 1));
    } else if (l.kind === 'text_input' || l.kind === 'scale_input') {
      l.children?.forEach((c) => visit(c, depth + 1));
    } else if (l.kind === 'oauth_login') {
      l.children.forEach((c) => visit(c, depth + 1));
    } else if (l.kind === 'oauth_provider' && l.variant === 'custom') {
      l.children.forEach((c) => visit(c, depth + 1));
    } else if (l.kind === 'email_password_auth') {
      l.children.forEach((c) => visit(c, depth + 1));
    } else if (l.kind === 'email_password_field') {
      l.children?.forEach((c) => visit(c, depth + 1));
    } else if (l.kind === 'email_password_submit') {
      l.children.forEach((c) => visit(c, depth + 1));
    }
  };
  visit(root, 0);
};

/** Walk every layer in a screen's regions (header → body → footer). */
export const walkScreen = (screen: Screen, fn: (l: Layer) => void): void => {
  if (screen.regions.header) walkLayers(screen.regions.header, fn);
  walkLayers(screen.regions.body, fn);
  if (screen.regions.footer) walkLayers(screen.regions.footer, fn);
};

/** Find the screen's lone input layer (if any). Schema enforces ≤1. */
export const findInputLayer = (screen: Screen): InputLayer | null => {
  let found: InputLayer | null = null;
  walkScreen(screen, (l) => {
    if (!found && isInputLayer(l)) found = l;
  });
  return found;
};

/** Input kinds that use a screen draft and require an explicit Continue to submit. */
export const findManualSubmitInputLayer = (
  screen: Screen,
): MultipleChoiceLayer | TextInputLayer | ScaleInputLayer | null => {
  const input = findInputLayer(screen);
  if (!input) return null;
  if (input.kind === 'multiple_choice' || input.kind === 'text_input' || input.kind === 'scale_input') {
    return input;
  }
  return null;
};

/**
 * Whether the screen contains any Button layer that submits the screen
 * (i.e. `action.kind === 'continue'`). Used by input layers to decide
 * between auto-submit-on-tap (legacy behaviour for choice-only screens)
 * and writing into the screen-level draft for a Button to submit.
 */
export const screenHasContinueButton = (screen: Screen): boolean => {
  let found = false;
  walkScreen(screen, (l) => {
    if (l.kind === 'button' && l.action.kind === 'continue') found = true;
  });
  return found;
};

/**
 * Resolve a choice layer's option stack by stable optionId via its
 * binding. Returns null when the binding is missing or the bound child
 * was removed (manifest validation rejects that, but runtime stays safe).
 */
export const findOptionStackForChoice = (
  layer: SingleChoiceLayer | MultipleChoiceLayer,
  optionId: string,
): StackLayer | null => {
  const binding = layer.optionBindings.find((b) => b.optionId === optionId);
  if (!binding) return null;
  const stack = layer.children.find((c) => c.id === binding.rootLayerId);
  return stack ?? null;
};

/**
 * Best-effort textual label for a choice option, used by interpolation
 * (e.g. `{{ goal }}` rendering the chosen option's label) and by editor
 * surfaces that show option rows. Walks the option's child subtree
 * depth-first and returns the first `text` layer's content; falls back
 * to the option's stable id when no text is present.
 */
export const choiceOptionLabel = (
  layer: SingleChoiceLayer | MultipleChoiceLayer,
  optionId: string,
  locale: string,
): string => {
  const stack = findOptionStackForChoice(layer, optionId);
  if (!stack) return '';
  let foundText: LocalizedText | null = null;
  walkLayers(stack, (l) => {
    if (foundText) return;
    if (l.kind === 'text') foundText = l.text;
  });
  if (foundText) return resolveLocalizedText(foundText, locale);
  return optionId;
};

/** Find a layer in a screen by id, including nested children/slides. */
export const findLayerById = (screen: Screen, id: string): Layer | null => {
  let found: Layer | null = null;
  walkScreen(screen, (l) => {
    if (!found && l.id === id) found = l;
  });
  return found;
};

/** Collect all input fieldKeys across a manifest. */
export const collectFieldKeys = (manifest: FlowManifest): { fieldKey: string; screenId: string }[] => {
  const out: { fieldKey: string; screenId: string }[] = [];
  for (const screen of manifest.screens) {
    walkScreen(screen as unknown as Screen, (l) => {
      if (isInputLayer(l)) out.push({ fieldKey: l.fieldKey, screenId: screen.id });
      if (l.kind === 'checkbox') out.push({ fieldKey: l.fieldKey, screenId: screen.id });
      if (l.kind === 'email_password_auth') {
        out.push({ fieldKey: l.fieldKey, screenId: screen.id });
      }
    });
  }
  return out;
};

/**
 * Pick a snake_case field key starting from `base` that is not in `used`
 * (e.g. `text` → `text_2` → `text_3` when `text` is taken).
 */
export const nextUniqueFieldKey = (base: string, used: Iterable<string>): string => {
  const set = used instanceof Set ? used : new Set(used);
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
};

/**
 * Resolve a token reference like `$primary` to a literal value from `theme`.
 * Pass-through for non-token strings; returns undefined for `undefined`.
 */
export const resolveTokens = <T extends string | undefined>(
  theme: Theme | undefined,
  value: T,
): T | string => {
  if (value === undefined) return value;
  if (typeof value !== 'string' || !value.startsWith('$')) return value;
  const key = value.slice(1) as keyof Theme;
  const literal = theme?.[key];
  if (typeof literal === 'string') return literal;
  return value;
};

/**
 * Resolve a layer color for the current appearance (`light` | `dark`).
 * Plain string uses `resolveTokens` for both modes (legacy). Object form
 * picks `light` / `dark` with fallback to the other key when one is omitted.
 */
export const resolveThemedColor = (
  theme: Theme | undefined,
  palette: 'light' | 'dark',
  value: ThemedColor | undefined,
): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return resolveTokens(theme, value) as string;
  const raw = palette === 'dark' ? (value.dark ?? value.light) : (value.light ?? value.dark);
  if (raw === undefined) return undefined;
  return resolveTokens(theme, raw) as string;
};

/**
 * Resolve a themed value used for CSS `background` (or RN background fill).
 * Supports `$brandGradient:<uuid>` when branding presets are provided; other values match {@link resolveThemedColor}.
 */
export const resolveThemedBackground = (
  theme: Theme | undefined,
  branding: Branding | undefined,
  palette: 'light' | 'dark',
  value: ThemedColor | undefined,
): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    if (value.startsWith('$brandGradient:')) {
      return resolveBrandGradientToken(branding, value);
    }
    return resolveTokens(theme, value) as string;
  }
  const raw = palette === 'dark' ? (value.dark ?? value.light) : (value.light ?? value.dark);
  if (raw === undefined) return undefined;
  if (raw.startsWith('$brandGradient:')) {
    return resolveBrandGradientToken(branding, raw);
  }
  return resolveTokens(theme, raw) as string;
};

export const nativeBrandBackgroundFromThemedColor = (
  theme: Theme | undefined,
  branding: Branding | undefined,
  palette: 'light' | 'dark',
  value: ThemedColor | undefined,
): { solid?: string; linear?: BrandGradientNativeLinear } => {
  const preset = brandGradientFromThemedColor(branding, palette, value);
  if (preset) {
    const lin = brandGradientNativeLinear(preset);
    if (lin) return { linear: lin };
    return { solid: brandGradientSolidFallback(preset) };
  }
  const bg = resolveThemedBackground(theme, branding, palette, value) as string | undefined;
  if (!bg) return {};
  const parsed = parseLinearGradientCss(bg);
  if (parsed) {
    return {
      linear: nativeLinearFromAngleAndStops(
        parsed.angleDeg,
        parsed.stops.map((s) => ({ color: s.color, offsetPct: s.offsetPct })),
      ),
    };
  }
  if (isStoredLinearGradientCss(bg)) {
    const first = bg.match(/#[0-9a-fA-F]{3,8}/);
    return { solid: first ? first[0] : '#808080' };
  }
  return { solid: bg };
};
