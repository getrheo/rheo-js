import { SDK_EVENT_FLUSH_MS, type SdkProductAnalyticsEvent } from '@getrheo/contracts';
import { createSdkLogger, type SdkLogger } from './logging.js';

const MAX_BATCH_SIZE = 500;
const MAX_QUEUED = 2_000;
const MAX_RETRY_DELAY_MS = 30_000;

export type ProductAnalyticsTransport = {
  publishableKey: string;
  apiBaseUrl: string;
  fetcher?: typeof fetch;
};

const retryableStatus = (status: number): boolean =>
  status === 408 || status === 429 || status >= 500;

/** In-memory batch for `POST /v1/sdk/analytics/events`. */
export class ProductAnalyticsQueue {
  private buffer: SdkProductAnalyticsEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inflight: Promise<void> | null = null;
  private disposed = false;
  private retryAttempt = 0;

  constructor(
    private readonly transport: ProductAnalyticsTransport,
    private readonly logger: SdkLogger = createSdkLogger('silent'),
  ) {}

  enqueue = (event: SdkProductAnalyticsEvent): void => {
    if (this.disposed) return;
    this.buffer.push(event);
    this.dropOldest();
    if (this.retryAttempt > 0) return;
    if (this.buffer.length >= MAX_BATCH_SIZE) {
      this.schedule(0);
      return;
    }
    this.schedule(SDK_EVENT_FLUSH_MS);
  };

  dispose = (): void => {
    if (this.disposed) return;
    this.disposed = true;
    this.clearTimer();
    void this.drain();
  };

  private dropOldest = (): void => {
    if (this.buffer.length <= MAX_QUEUED) return;
    this.buffer.splice(0, this.buffer.length - MAX_QUEUED);
  };

  private clearTimer = (): void => {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  };

  private schedule = (delayMs: number): void => {
    if (this.disposed) return;
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.drain();
    }, delayMs);
  };

  private scheduleRetry = (): void => {
    const shift = Math.min(this.retryAttempt - 1, 5);
    this.schedule(Math.min(MAX_RETRY_DELAY_MS, 1_000 * 2 ** shift));
  };

  private drain = async (): Promise<void> => {
    if (this.inflight) {
      await this.inflight;
      return;
    }
    if (this.buffer.length === 0) return;
    if (!this.disposed && this.retryAttempt > 0 && this.timer) return;
    const events = this.buffer.splice(0, MAX_BATCH_SIZE);
    let retry = false;
    this.inflight = (async () => {
      try {
        const res = await (this.transport.fetcher ?? fetch)(
          `${this.transport.apiBaseUrl}/v1/sdk/analytics/events`,
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${this.transport.publishableKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({ events }),
          },
        );
        if (res.ok) {
          this.retryAttempt = 0;
          return;
        }
        this.logger.warn('[rheo] product analytics flush failed', { status: res.status });
        retry = !this.disposed && retryableStatus(res.status);
      } catch (err) {
        this.logger.warn('[rheo] product analytics flush error', err);
        retry = !this.disposed;
      }
    })().finally(() => {
      this.inflight = null;
    });
    await this.inflight;
    if (retry) {
      this.retryAttempt += 1;
      this.buffer.unshift(...events);
      this.dropOldest();
      this.scheduleRetry();
      return;
    }
    if (this.buffer.length > 0) await this.drain();
  };
}
