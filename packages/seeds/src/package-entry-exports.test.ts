import { describe, expect, it } from 'vitest';
import { buildWelcomeLinearManifest, SEED_WELCOME_FLOW_NAME } from './index';

describe('@rheo/seeds', () => {
  it('builds welcome manifest', () => {
    const m = buildWelcomeLinearManifest('00000000-0000-0000-0000-000000000099');
    expect(m.screens.length).toBeGreaterThan(0);
    expect(SEED_WELCOME_FLOW_NAME).toBeTruthy();
  });
});
