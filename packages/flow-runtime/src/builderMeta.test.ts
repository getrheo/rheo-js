import { describe, expect, it } from 'vitest';
import { initFlowState, startFlow, submitResponse } from './stateMachine';
import { validFlow } from '@rheo/contracts-fixtures/validFlow';
import { FlowManifestSchema } from '@getrheo/contracts';

describe('builderMeta is non-runtime', () => {
  it('is preserved by the schema but ignored by the state machine', () => {
    const manifest = {
      ...validFlow(),
      builderMeta: {
        layout: {
          nodes: [
            { id: 'scr_welcome', x: 100, y: 200 },
            { id: 'scr_goal', x: 200, y: 400 },
          ],
        },
      },
    };
    const parsed = FlowManifestSchema.parse(manifest);
    expect(parsed.builderMeta?.layout?.nodes?.[0]?.id).toBe('scr_welcome');

    let state = startFlow(initFlowState(parsed));
    state = submitResponse(state, { kind: 'cta', action: 'primary' });
    expect(state.currentScreenId).toBe('scr_goal');
  });
});
