import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestWebNotificationOutcome, __resetWebPushForTests } from './webPush.js';

describe('requestWebNotificationOutcome', () => {
  afterEach(() => {
    __resetWebPushForTests();
    vi.unstubAllGlobals();
  });

  it('stays denied when Notification is missing', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(requestWebNotificationOutcome()).resolves.toBe('denied');
  });

  it('reports blocked when the browser already denied notifications', async () => {
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission: vi.fn() });
    await expect(requestWebNotificationOutcome()).resolves.toBe('blocked');
  });

  it('reports granted after the user allows notifications', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn(async () => 'granted'),
    });
    await expect(requestWebNotificationOutcome()).resolves.toBe('granted');
  });
});
