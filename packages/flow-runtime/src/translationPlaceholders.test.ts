import { describe, expect, it } from 'vitest';
import {
  extractTranslationPlaceholders,
  translationPlaceholdersMatch,
} from './translationPlaceholders';

describe('extractTranslationPlaceholders', () => {
  it('collects Liquid tags and lone brace tokens without cross-interference', () => {
    const s = `Hi {{ name | default: "x" }}, count is {n} {{ goal }}`;
    const got = extractTranslationPlaceholders(s);
    expect(got).toContain('{{name | default: "x"}}');
    expect(got).toContain('{n}');
    expect(got).toContain('{{goal}}');
  });
});

describe('translationPlaceholdersMatch', () => {
  it('returns true only when placeholders match multiset', () => {
    expect(translationPlaceholdersMatch('Hello {x}', 'Bonjour {x}')).toBe(true);
    expect(translationPlaceholdersMatch('Hello {x}', 'Bonjour {y}')).toBe(false);
    expect(
      translationPlaceholdersMatch(
        '{{ first_name }}, meet {{ coach }}',
        '{{ first_name }}, voici {{ coach }}',
      ),
    ).toBe(true);
    expect(
      translationPlaceholdersMatch(
        '{{ first_name }}, meet {{ coach }}',
        '{{ first_name }}, voici {{ coach }}, extra {{ bad }}',
      ),
    ).toBe(false);
  });
});
