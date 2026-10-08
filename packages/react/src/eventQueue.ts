import { SDK_EVENT_FLUSH_MS, type SdkEvent } from '@getrheo/contracts';
import { buildSdkEvent, type SdkEventBuildConfig, type TrackEventInput } from './events.js';
import { createSdkLogger, type SdkLogger } from './logging.js';

const MAX_BATCH_SIZE = 500;
const TERMINAL_EVENTS: ReadonlySet<SdkEvent['name']> = new Set([
  'flow_completed',
  'flow_abandoned',
]);

export type EventQueueTransport = {
  publishableKey: string;
  apiBaseUrl: string;
  fetcher?: typeof fetch;
};

type BufferedItem = {
  channelId: string;
  input: TrackEventInput;
};

export class EventQueue {
  private buffer: BufferedItem[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inflight: Promise<void> | null = null;
  private disposed = false;

  constructor(
    private readonly transport: EventQueueTransport,
    private readonly getSdkEventBuildConfig: () => SdkEventBuildConfig,
    private readonly logger: SdkLogger = createSdkLogger('silent'),
  ) {}

  enqueue = (input: TrackEventInput, meta: { channelId: string }): void => {
    if (this.disposed) return;
    const ch = meta.channelId?.trim();
    if (!ch) {
      this.logger.warn('[rheo] enqueue skipped: missing channelId', { name: input.name });
      return;
    }
    this.buffer.push({ channelId: ch, input });
    if (this.buffer.length >= MAX_BATCH_SIZE || TERMINAL_EVENTS.has(input.name)) {
      this.scheduleFlushNow();
      return;
    }
    this.scheduleFlushSoon();
  };

  flush = async (): Promise<void> => {
    if (this.inflight) await this.inflight;
    await this.drain();
  };

  dispose = (): void => {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    void this.drain();
  };

  private scheduleFlushSoon = (): void => {
    if (this.timer || this.disposed) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.drain();
    }, SDK_EVENT_FLUSH_MS);
  };

  private scheduleFlushNow = (): void => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    void this.drain();
  };

  private drain = async (): Promise<void> => {
    if (this.inflight) {
      await this.inflight;
      return;
    }
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    const byChannel = new Map<string, TrackEventInput[]>();
    for (const item of batch) {
      const list = byChannel.get(item.channelId) ?? [];
      list.push(item.input);
      byChannel.set(item.channelId, list);
    }
    const config = this.getSdkEventBuildConfig();
    const fetcher = this.transport.fetcher ?? fetch;
    this.inflight = (async () => {
      for (const [channelId, inputs] of byChannel) {
        const events = inputs.map((input) => buildSdkEvent(config, input));
        try {
          const res = await fetcher(`${this.transport.apiBaseUrl}/v1/sdk/events`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${this.transport.publishableKey}`,
              'content-type': 'application/json',
              'x-rheo-channel': channelId,
            },
            body: JSON.stringify({ events }),
          });
          if (!res.ok) {
            this.logger.warn('[rheo] events flush failed', { status: res.status, channelId });
          }
        } catch (err) {
          this.logger.warn('[rheo] events flush error', err);
        }
      }
    })().finally(() => {
      this.inflight = null;
    });
    await this.inflight;
  };
}
