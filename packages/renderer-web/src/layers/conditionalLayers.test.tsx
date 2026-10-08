import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ConditionalLayer, StackLayer } from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import { LayerRenderer } from '../LayerRenderer';

const branchStack = (id: string, label: string): StackLayer => ({
  id,
  kind: 'stack',
  direction: 'vertical',
  children: [{ id: `${id}_text`, kind: 'text', text: { default: label } }],
});

const platformCase = (platform: string, caseId: string, rootLayerId: string) => ({
  id: caseId,
  expression: {
    kind: 'predicate' as const,
    variable: { kind: 'builtin' as const, name: 'platform' as const },
    predicate: { type: 'string' as const, pred: { op: 'eq' as const, value: platform } },
  },
  rootLayerId,
});

const conditional = (): ConditionalLayer => ({
  id: 'lyr_cond',
  kind: 'conditional',
  cases: [
    platformCase('ios', 'case_ios', 'lyr_cond_ios'),
    platformCase('android', 'case_android', 'lyr_cond_android'),
  ],
  elseRootLayerId: 'lyr_cond_else',
  children: [
    branchStack('lyr_cond_ios', 'iOS branch'),
    branchStack('lyr_cond_android', 'Android branch'),
    branchStack('lyr_cond_else', 'Else branch'),
  ],
});

const conditionalScreen = (): Screen => ({
  id: 'scr_cond',
  name: 'Conditional',
  next: { default: null },
  regions: {
    body: {
      id: 'lyr_body',
      kind: 'stack',
      direction: 'vertical',
      children: [conditional()],
    },
  },
});

const render = (props: {
  conditionalEval?: { platform?: string };
  conditionalCasePreview?: Record<string, string>;
}) =>
  renderToStaticMarkup(
    <LayerRenderer
      manifest={validFlow()}
      screen={conditionalScreen()}
      mode="static"
      theme="light"
      {...props}
    />,
  );

describe('ConditionalView', () => {
  it('renders only the branch whose case matches', () => {
    const html = render({ conditionalEval: { platform: 'android' } });
    expect(html).toContain('Android branch');
    expect(html).not.toContain('iOS branch');
    expect(html).not.toContain('Else branch');
  });

  it('falls back to the else stack when no case matches', () => {
    const html = render({ conditionalEval: { platform: 'web' } });
    expect(html).toContain('Else branch');
    expect(html).not.toContain('iOS branch');
  });

  it('honors a builder case preview over live evaluation', () => {
    const html = render({
      conditionalEval: { platform: 'android' },
      conditionalCasePreview: { lyr_cond: 'case_ios' },
    });
    expect(html).toContain('iOS branch');
    expect(html).not.toContain('Android branch');
  });

  it('adds no wrapper chrome of its own', () => {
    const html = render({ conditionalEval: { platform: 'ios' } });
    expect(html).not.toContain('data-layer-shell="lyr_cond"');
  });
});
