import { extractLiquidTemplateBodies } from './interpolateTemplate';

/**
 * Serialized placeholder tokens for parity checks (sorted, JSON-stable).
 */
const sortedJson = (tokens: string[]): string => JSON.stringify([...tokens].sort());

/**
 * Strips `{{ ... }}` Liquid regions from a string so lone `{foo}` patterns
 * aren't confused with Liquid delimiters.
 */
const stripLiquidRegions = (s: string): string => {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf('{{', i);
    if (open === -1) return out + s.slice(i);
    out += s.slice(i, open);
    const close = s.indexOf('}}', open + 2);
    if (close === -1) return out + s.slice(open);
    i = close + 2;
  }
  return out;
};

/**
 * Tokens that must be preserved verbatim when translating (Liquid `{{ ... }}`
 * tags and simple `{identifier}` placeholders). Used for server-side validation.
 */
export const extractTranslationPlaceholders = (s: string): string[] => {
  const liquids = extractLiquidTemplateBodies(s).map((inner) => `{{${inner.trim()}}}`);
  const stripped = stripLiquidRegions(s);
  const singles: string[] = [];
  const re = /\{([a-zA-Z_]\w*)\}/g;
  for (const m of stripped.matchAll(re)) {
    singles.push(`{${m[1]}}`);
  }
  return [...liquids, ...singles];
};

/** True when both strings contain the same multiset of placeholder markers. */
export const translationPlaceholdersMatch = (source: string, translated: string): boolean =>
  sortedJson(extractTranslationPlaceholders(source)) ===
  sortedJson(extractTranslationPlaceholders(translated));
