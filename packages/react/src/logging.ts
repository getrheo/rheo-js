import type { SdkLogLevel } from '@getrheo/contracts/sdk';

export type SdkLogger = {
  warn: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

let level: SdkLogLevel = 'silent';

export const registerSdkLogLevel = (next: SdkLogLevel): void => {
  level = next;
};

export const createSdkLogger = (logLevel: SdkLogLevel = level): SdkLogger => ({
  warn: (...args: unknown[]) => {
    if (logLevel === 'silent') return;
    console.warn(...args);
  },
  debug: (...args: unknown[]) => {
    if (logLevel !== 'debug') return;
    console.debug(...args);
  },
});

export const getSdkLogger = (): SdkLogger => createSdkLogger(level);
