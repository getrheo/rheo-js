import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen, ScreenBackgroundVideoFill } from '@getrheo/contracts';
import { isScreenBackgroundPlaybackId, screenBackgroundPlaybackId } from '@getrheo/contracts';
import {
  isInputLayer,
  OS_PERMISSION_OUTCOME_CONTINUE,
  OS_PERMISSION_OUTCOME_END,
  type ButtonLayer,
  type IconLayer,
  type LottieLayer,
  type TextLayer,
  type VideoLayer,
} from '@getrheo/contracts/layers';
import { findLayerById, walkScreen } from './layers';

/** Agent-facing bullets for rules enforced by {@link collectFlowBuilderIssues}. Keep in sync with checks below. */
export const BUILDER_RULES_AGENT_BULLETS: readonly string[] = [
  'Connect flow entry on the canvas before publishing (entryScreenId must exist when screens are present).',
  'Every text and icon layer needs explicit style.color (including nested button label text — native does not inherit colors).',
  'Screens with text_input, multiple_choice, scale_input, or wheel_picker need a button with action.kind "continue".',
  'At most one input layer per screen (single_choice, multiple_choice, text_input, scale_input, wheel_picker).',
  'Do not combine oauth_login or email_password_auth with other input layers on the same screen.',
  'Only one oauth_login and one email_password_auth per screen; never both on the same screen.',
  'fieldKey values must be unique snake_case across the flow.',
  'Choice branch goTo and go_to_step screenId must reference screens, decisions, or integrations.',
  'request_app_review buttons require screen.next.default wired to a valid target.',
  'request_os_permission outcomes must target screens, decisions, integrations, "continue", or "end".',
  'Lottie/video with autoPlay false needs a button with action.kind "play_media" targeting that layer (or screen background video id).',
  'play_media targetLayerIds must reference Lottie/video layers on the same screen or the screen background video playback id.',
];

const FIELD_KEY_RE = /^[a-z][a-z0-9_]*$/;

const styleBucketHasColor = (s: { color?: unknown } | undefined): boolean =>
  s !== undefined && s.color !== undefined;

/** Text must carry explicit `color` (base or any breakpoint) so native SDK matches canvas without CSS inheritance. */
export const textLayerHasAuthoringColor = (l: TextLayer): boolean => {
  if (styleBucketHasColor(l.style)) return true;
  const bp = l.styleBreakpoints;
  if (!bp) return false;
  return (
    styleBucketHasColor(bp.sm) ||
    styleBucketHasColor(bp.md) ||
    styleBucketHasColor(bp.lg) ||
    styleBucketHasColor(bp.xl) ||
    styleBucketHasColor(bp['2xl'])
  );
};

export const iconLayerHasAuthoringColor = (l: IconLayer): boolean => {
  if (styleBucketHasColor(l.style)) return true;
  const bp = l.styleBreakpoints;
  if (!bp) return false;
  return (
    styleBucketHasColor(bp.sm) ||
    styleBucketHasColor(bp.md) ||
    styleBucketHasColor(bp.lg) ||
    styleBucketHasColor(bp.xl) ||
    styleBucketHasColor(bp['2xl'])
  );
};

/**
 * Builder / dashboard semantic checks beyond {@link FlowManifestSchema}.
 * Kept in flow-runtime so seeds, API, and the web editor share one definition.
 */
export const collectFlowBuilderIssues = (manifest: FlowManifest): string[] => {
  const issues: string[] = [];
  const fieldKeyOwners = new Map<string, string[]>();
  const screenIds = new Set(manifest.screens.map((s) => s.id));
  const jumpTargetIds = new Set<string>([
    ...screenIds,
    ...manifest.decisionNodes.map((d) => d.id),
    ...(manifest.externalSurfaceNodes ?? []).map((n) => n.id),
  ]);

  if (manifest.entryScreenId == null) {
    if (manifest.screens.length > 0) {
      issues.push(
        'Connect the flow entry node on the canvas to where the flow starts (a screen, decision, or integration step).',
      );
    }
  } else if (!jumpTargetIds.has(manifest.entryScreenId)) {
    issues.push(`Flow entry target "${manifest.entryScreenId}" does not exist.`);
  }

  for (const screen of manifest.screens as unknown as Screen[]) {
    let inputCount = 0;
    let oauthLoginLayerCount = 0;
    let emailPasswordAuthLayerCount = 0;
    let needsManualSubmit = false;
    let hasContinueButton = false;
    const screenLabel = screen.name || screen.id;
    const mediaLayerIds = new Set<string>();
    const buttonLayerIds = new Set<string>();
    const shellPlaybackId = screenBackgroundPlaybackId(screen.id);
    const shellFill = screen.containerStyle?.backgroundFill;
    const shellVideoFill =
      shellFill?.kind === 'video' ? (shellFill as ScreenBackgroundVideoFill) : undefined;

    walkScreen(screen, (l) => {
      if (l.kind === 'button') buttonLayerIds.add(l.id);
    });

    if (shellFill?.kind === 'image' || shellFill?.kind === 'video') {
      if (!shellFill.media?.mediaAssetId) {
        issues.push(
          `Screen "${screenLabel}" ${shellFill.kind} background needs a media asset.`,
        );
      }
    }

    if (shellVideoFill) {
      if (shellVideoFill.autoPlay === false) {
        const triggerId = shellVideoFill.triggerLayerId?.trim();
        if (!triggerId) {
          issues.push(
            `Screen "${screenLabel}" background video needs a trigger button when auto-play is off.`,
          );
        } else if (!buttonLayerIds.has(triggerId)) {
          issues.push(
            `Screen "${screenLabel}" background video references a missing trigger button "${triggerId}".`,
          );
        } else {
          const btn = findLayerById(screen, triggerId) as ButtonLayer | null;
          if (!btn || btn.kind !== 'button') {
            issues.push(
              `Screen "${screenLabel}" background video trigger must be a button layer.`,
            );
          } else if (btn.action.kind !== 'play_media') {
            issues.push(
              `Screen "${screenLabel}" background video trigger button must use On Tap → Play media.`,
            );
          } else if (!btn.action.targetLayerIds.includes(shellPlaybackId)) {
            issues.push(
              `Screen "${screenLabel}" background video is not listed on trigger button "${triggerId}".`,
            );
          }
        }
      } else if (shellVideoFill.triggerLayerId) {
        const btn = findLayerById(screen, shellVideoFill.triggerLayerId);
        if (
          btn?.kind === 'button' &&
          btn.action.kind === 'play_media' &&
          !btn.action.targetLayerIds.includes(shellPlaybackId)
        ) {
          issues.push(
            `Screen "${screenLabel}" background video trigger button does not target the screen background.`,
          );
        }
      }
    }

    walkScreen(screen, (l) => {
      if (l.kind === 'lottie' || l.kind === 'video') mediaLayerIds.add(l.id);
      if (l.kind === 'oauth_login') {
        oauthLoginLayerCount += 1;
      }
      if (l.kind === 'email_password_auth') {
        emailPasswordAuthLayerCount += 1;
      }
      if (l.kind === 'button' && l.action.kind === 'continue') {
        hasContinueButton = true;
      }
      if (isInputLayer(l)) {
        inputCount += 1;
        if (
          l.kind === 'multiple_choice' ||
          l.kind === 'text_input' ||
          l.kind === 'scale_input' ||
          l.kind === 'wheel_picker'
        ) {
          needsManualSubmit = true;
        }
        const key = l.fieldKey;
        const label = screen.name || screen.id;
        if (!key || key.length === 0) {
          issues.push(`Screen "${label}" is missing a variable name (fieldKey).`);
        } else if (!FIELD_KEY_RE.test(key)) {
          issues.push(
            `Screen "${label}" has an invalid variable name "${key}" — use snake_case (a–z, 0–9, _).`,
          );
        } else {
          const owners = fieldKeyOwners.get(key) ?? [];
          owners.push(label);
          fieldKeyOwners.set(key, owners);
        }

        if (l.kind === 'single_choice' || l.kind === 'multiple_choice') {
          for (const cond of l.branching.conditions) {
            if (!jumpTargetIds.has(cond.goTo)) {
              issues.push(
                `Screen "${label}" branches choice "${cond.choiceId}" to a missing destination "${cond.goTo}".`,
              );
            }
          }
        }
      }
      if (l.kind === 'button' && l.action.kind === 'go_to_step') {
        if (!jumpTargetIds.has(l.action.screenId)) {
          issues.push(
            `Button "${l.name || l.id}" on screen "${screen.name || screen.id}" targets a missing destination "${l.action.screenId}".`,
          );
        }
      }
      if (l.kind === 'loader' && l.onComplete?.mode === 'screen') {
        if (!jumpTargetIds.has(l.onComplete.screenId)) {
          issues.push(
            `Loader "${l.name || l.id}" on screen "${screen.name || screen.id}" onComplete targets a missing destination "${l.onComplete.screenId}".`,
          );
        }
      }
      if (
        (l.kind === 'lottie' || l.kind === 'video') &&
        l.onComplete?.mode === 'screen'
      ) {
        if (!jumpTargetIds.has(l.onComplete.screenId)) {
          issues.push(
            `${l.kind === 'video' ? 'Video' : 'Lottie'} "${l.name || l.id}" on screen "${screen.name || screen.id}" onComplete targets a missing destination "${l.onComplete.screenId}".`,
          );
        }
      }
      if (l.kind === 'button' && l.action.kind === 'request_app_review') {
        const def = screen.next?.default;
        if (def == null) {
          issues.push(
            `Button "${l.name || l.id}" on screen "${screen.name || screen.id}" requests app review but the screen has no default next step.`,
          );
        } else if (!screenIds.has(def) && !manifest.decisionNodes?.some((d) => d.id === def)) {
          issues.push(
            `Button "${l.name || l.id}" on screen "${screen.name || screen.id}" requests app review but default next "${def}" is missing.`,
          );
        }
      }
      if (l.kind === 'button' && l.action.kind === 'request_os_permission') {
        const o = l.action.outcomes;
        for (const slot of ['granted', 'denied', 'blocked'] as const) {
          const sid = o[slot];
          if (sid === OS_PERMISSION_OUTCOME_END) {
            continue;
          }
          if (sid === OS_PERMISSION_OUTCOME_CONTINUE) {
            const def = screen.next?.default;
            if (def == null) {
              continue;
            }
            if (!jumpTargetIds.has(def)) {
              issues.push(
                `Button "${l.name || l.id}" on screen "${screen.name || screen.id}" (${slot}) continues to missing target "${def}".`,
              );
            }
            continue;
          }
          if (!jumpTargetIds.has(sid)) {
            issues.push(
              `Button "${l.name || l.id}" on screen "${screen.name || screen.id}" (${slot}) targets a missing destination "${sid}".`,
            );
          }
        }
      }
      if (l.kind === 'back_button' && l.fallbackScreenId && !screenIds.has(l.fallbackScreenId)) {
        issues.push(
          `Back button "${l.name || l.id}" on screen "${screen.name || screen.id}" uses a missing fallback screen "${l.fallbackScreenId}".`,
        );
      }
      if (l.kind === 'button' && l.action.kind === 'go_back_one_screen' && l.action.fallbackScreenId) {
        if (!screenIds.has(l.action.fallbackScreenId)) {
          issues.push(
            `Button "${l.name || l.id}" on screen "${screen.name || screen.id}" uses a missing fallback screen "${l.action.fallbackScreenId}".`,
          );
        }
      }
      if (l.kind === 'lottie' || l.kind === 'video') {
        const media = l as LottieLayer | VideoLayer;
        if (media.autoPlay === false) {
          const triggerId = media.triggerLayerId?.trim();
          if (!triggerId) {
            issues.push(
              `${media.kind === 'video' ? 'Video' : 'Lottie'} "${media.name || media.id}" on screen "${screenLabel}" needs a trigger button when auto-play is off.`,
            );
          } else if (!buttonLayerIds.has(triggerId)) {
            issues.push(
              `${media.kind === 'video' ? 'Video' : 'Lottie'} "${media.name || media.id}" on screen "${screenLabel}" references a missing trigger button "${triggerId}".`,
            );
          } else {
            const btn = findLayerById(screen, triggerId) as ButtonLayer | null;
            if (!btn || btn.kind !== 'button') {
              issues.push(
                `${media.kind === 'video' ? 'Video' : 'Lottie'} "${media.name || media.id}" on screen "${screenLabel}" trigger must be a button layer.`,
              );
            } else if (btn.action.kind !== 'play_media') {
              issues.push(
                `${media.kind === 'video' ? 'Video' : 'Lottie'} "${media.name || media.id}" on screen "${screenLabel}" trigger button must use On Tap → Play media (or pick the trigger again from this screen).`,
              );
            } else if (!btn.action.targetLayerIds.includes(media.id)) {
              issues.push(
                `${media.kind === 'video' ? 'Video' : 'Lottie'} "${media.name || media.id}" on screen "${screenLabel}" is not listed on trigger button "${triggerId}".`,
              );
            }
          }
        } else if (media.triggerLayerId) {
          const btn = findLayerById(screen, media.triggerLayerId);
          if (btn?.kind === 'button' && btn.action.kind === 'play_media' && !btn.action.targetLayerIds.includes(media.id)) {
            issues.push(
              `${media.kind === 'video' ? 'Video' : 'Lottie'} "${media.name || media.id}" on screen "${screenLabel}" trigger button does not target this layer.`,
            );
          }
        }
      }
      if (l.kind === 'button' && l.action.kind === 'play_media') {
        for (const targetId of l.action.targetLayerIds) {
          if (targetId === shellPlaybackId) {
            if (!shellVideoFill) {
              issues.push(
                `Button "${l.name || l.id}" on screen "${screenLabel}" targets screen background video, but this screen has no video background.`,
              );
            }
            continue;
          }
          if (isScreenBackgroundPlaybackId(targetId)) {
            issues.push(
              `Button "${l.name || l.id}" on screen "${screenLabel}" play-media target "${targetId}" is not valid for this screen.`,
            );
            continue;
          }
          if (!mediaLayerIds.has(targetId)) {
            issues.push(
              `Button "${l.name || l.id}" on screen "${screenLabel}" play-media target "${targetId}" must be a Lottie or video layer on this screen, or screen background video.`,
            );
          }
        }
      }
    });

    if (oauthLoginLayerCount > 0 && inputCount > 0) {
      issues.push(
        `Screen "${screen.name || screen.id}" cannot combine OAuth Login with input layers (${inputCount}). Split them onto separate screens.`,
      );
    }

    if (emailPasswordAuthLayerCount > 0 && inputCount > 0) {
      issues.push(
        `Screen "${screen.name || screen.id}" cannot combine Email / password login with input layers (${inputCount}). Split them onto separate screens.`,
      );
    }

    if (oauthLoginLayerCount > 0 && emailPasswordAuthLayerCount > 0) {
      issues.push(
        `Screen "${screen.name || screen.id}" cannot combine OAuth Login with Email / password login. Use one login block per screen.`,
      );
    }

    if (emailPasswordAuthLayerCount > 1) {
      issues.push(
        `Screen "${screen.name || screen.id}" has ${emailPasswordAuthLayerCount} Email / password login layers; only one is allowed per screen.`,
      );
    }

    if (oauthLoginLayerCount > 1) {
      issues.push(
        `Screen "${screen.name || screen.id}" has ${oauthLoginLayerCount} OAuth Login layers; only one is allowed per screen.`,
      );
    }

    if (inputCount > 1) {
      issues.push(
        `Screen "${screen.name || screen.id}" has ${inputCount} input layers; only one is allowed.`,
      );
    }

    if (needsManualSubmit && !hasContinueButton) {
      issues.push(
        `Screen "${screen.name || screen.id}" has a multiple_choice, text_input, scale_input, or wheel_picker but no Button with action "continue". Add a Continue button so users can submit.`,
      );
    }
  }

  for (const [key, owners] of fieldKeyOwners) {
    if (owners.length > 1) {
      issues.push(`Variable name "${key}" is used by multiple screens: ${owners.join(', ')}.`);
    }
  }

  for (const screen of manifest.screens as unknown as Screen[]) {
    walkScreen(screen, (l) => {
      const screenLabel = screen.name || screen.id;
      if (l.kind === 'text' && !textLayerHasAuthoringColor(l)) {
        issues.push(
          `Screen "${screenLabel}": text layer "${l.id}" must set style.color for light and dark (CSS inheritance does not apply on native).`,
        );
      }
      if (l.kind === 'icon' && !iconLayerHasAuthoringColor(l)) {
        issues.push(
          `Screen "${screenLabel}": icon layer "${l.id}" must set style.color for light and dark.`,
        );
      }
    });
  }

  return issues;
};
