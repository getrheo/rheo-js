import { describe, expect, it } from 'vitest';
import { walkScreen } from './layers';
import { validateManifest } from './validation';

describe('@getrheo/flow-runtime public surface', () => {
  it('exports walkScreen and validateManifest', () => {
    expect(typeof walkScreen).toBe('function');
    expect(typeof validateManifest).toBe('function');
  });
});
