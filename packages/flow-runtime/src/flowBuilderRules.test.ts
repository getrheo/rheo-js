import { describe, expect, it } from 'vitest';
import { PRIMARY_FILLED_LABEL } from '@getrheo/contracts/layers';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import { screenBackgroundPlaybackId } from '@getrheo/contracts';
import { collectFlowBuilderIssues } from './flowBuilderRules';

const minimalManifest = (): FlowManifest =>
  ({
    flowId: '00000000-0000-0000-0000-000000000001',
    schemaVersion: 7,
    version: 1,
    defaultLocale: 'en',
    locales: ['en'],
    entryScreenId: 'scr_a',
    screens: [
      {
        id: 'scr_a',
        name: 'A',
        regions: {
          body: {
            id: 'lyr_body',
            kind: 'stack',
            direction: 'vertical',
            children: [
              {
                id: 'lyr_in',
                kind: 'text_input',
                name: 'Q',
                fieldKey: 'q',
                classification: 'safe',
              },
            ],
          },
        },
        next: { default: null },
      },
    ],
    decisionNodes: [],
    externalSurfaceNodes: [],
    sdkAttributeKeys: [],
  }) as unknown as FlowManifest;

describe('collectFlowBuilderIssues', () => {
  it('requires a Continue button when a text_input is present', () => {
    const issues = collectFlowBuilderIssues(minimalManifest());
    expect(issues.some((m) => m.includes('continue'))).toBe(true);
  });

  it('clears when a Continue button exists', () => {
    const m = minimalManifest();
    const body = m.screens[0]!.regions.body;
    (
      body.children as Array<{
        id: string;
        kind: string;
        variant?: string;
        action?: { kind: string };
        children?: unknown[];
      }>
    ).push({
      id: 'lyr_go',
      kind: 'button',
      variant: 'primary',
      action: { kind: 'continue' },
      children: [{ id: 'lyr_go_t', kind: 'text', text: { default: 'Go' }, style: { color: PRIMARY_FILLED_LABEL } }],
    });
    const issues = collectFlowBuilderIssues(m);
    expect(issues.filter((i) => i.includes('continue'))).toEqual([]);
  });

  it('requires a trigger button when video autoPlay is false', () => {
    const m = minimalManifest();
    const body = m.screens[0]!.regions.body;
    (body.children as Array<Record<string, unknown>>).push({
      id: 'lyr_vid',
      kind: 'video',
      autoPlay: false,
    });
    const issues = collectFlowBuilderIssues(m);
    expect(issues.some((i) => i.includes('lyr_vid') && i.includes('trigger button'))).toBe(true);
  });

  it('passes when manual video has synced play_media trigger button', () => {
    const m = minimalManifest();
    const body = m.screens[0]!.regions.body;
    const children = body.children as Array<Record<string, unknown>>;
    children.length = 0;
    children.push(
      {
        id: 'lyr_vid',
        kind: 'video',
        autoPlay: false,
        triggerLayerId: 'lyr_btn',
      },
      {
        id: 'lyr_btn',
        kind: 'button',
        variant: 'primary',
        action: { kind: 'play_media', targetLayerIds: ['lyr_vid'] },
        children: [],
      },
    );
    const issues = collectFlowBuilderIssues(m);
    expect(issues.filter((i) => i.includes('lyr_vid') || i.includes('play-media'))).toEqual([]);
  });

  it('flags play_media targets that are not video or lottie', () => {
    const m = minimalManifest();
    const body = m.screens[0]!.regions.body;
    (body.children as Array<Record<string, unknown>>).push({
      id: 'lyr_btn',
      kind: 'button',
      variant: 'primary',
      action: { kind: 'play_media', targetLayerIds: ['lyr_in'] },
      children: [],
    });
    const issues = collectFlowBuilderIssues(m);
    expect(issues.some((i) => i.includes('play-media target'))).toBe(true);
  });

  it('requires shell video trigger when background autoPlay is false', () => {
    const m = minimalManifest();
    m.screens[0]!.containerStyle = {
      backgroundFill: {
        kind: 'video',
        media: { mediaAssetId: '00000000-0000-4000-8000-000000000099' },
        autoPlay: false,
      },
    };
    const issues = collectFlowBuilderIssues(m);
    expect(issues.some((i) => i.includes('background video') && i.includes('trigger'))).toBe(
      true,
    );
  });

  it('passes when shell video has synced play_media trigger', () => {
    const m = minimalManifest();
    const body = m.screens[0]!.regions.body;
    const shellId = screenBackgroundPlaybackId('scr_a');
    (body.children as Array<Record<string, unknown>>).length = 0;
    (body.children as Array<Record<string, unknown>>).push(
      {
        id: 'lyr_btn',
        kind: 'button',
        variant: 'primary',
        action: { kind: 'play_media', targetLayerIds: [shellId] },
        children: [],
      },
    );
    m.screens[0]!.containerStyle = {
      backgroundFill: {
        kind: 'video',
        media: { mediaAssetId: '00000000-0000-4000-8000-000000000099' },
        autoPlay: false,
        triggerLayerId: 'lyr_btn',
      },
    };
    const issues = collectFlowBuilderIssues(m);
    expect(issues.filter((i) => i.includes('background video'))).toEqual([]);
  });

  it('flags text layers missing explicit themed color', () => {
    const m = minimalManifest();
    const body = m.screens[0]!.regions.body;
    (
      body.children as Array<{ id: string; kind: string; children?: unknown[]; text?: unknown }>
    ).push({
      id: 'lyr_bad',
      kind: 'text',
      text: { default: 'No color' },
    });
    const issues = collectFlowBuilderIssues(m);
    expect(issues.some((i) => i.includes('lyr_bad') && i.includes('style.color'))).toBe(true);
  });
});
