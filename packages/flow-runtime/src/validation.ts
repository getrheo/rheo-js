import type { z } from 'zod';
import { FlowManifestSchema, migrateLegacyManifest } from '@getrheo/contracts';
import type { FlowManifest } from '@getrheo/contracts';
import type { Screen } from '@getrheo/contracts/screens';
import { OS_PERMISSION_OUTCOME_CONTINUE, OS_PERMISSION_OUTCOME_END } from '@getrheo/contracts/layers';
import { EXTERNAL_SURFACE_NO_NEXT } from '@getrheo/contracts/decisions';
import { findInputLayer, walkScreen } from './layers';

export type ManifestValidationIssue = {
  /** Screen id when the issue is screen-scoped, null otherwise. Field name kept as `stepId` for back-compat with API/dashboard wire types. */
  stepId?: string | null;
  path: (string | number)[];
  message: string;
  code: string;
};

export const validateManifest = (
  data: unknown,
):
  | { ok: true; manifest: FlowManifest }
  | { ok: false; issues: ManifestValidationIssue[] } => {
  const migrated = migrateLegacyManifest(data);
  const result = FlowManifestSchema.safeParse(migrated);
  if (result.success) return { ok: true, manifest: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((i: z.ZodIssue) => {
      const screenIdx = i.path[1];
      const screenId =
        typeof screenIdx === 'number' && Array.isArray((data as FlowManifest)?.screens)
          ? (data as FlowManifest).screens[screenIdx]?.id
          : undefined;
      return {
        stepId: screenId ?? null,
        path: [...i.path],
        message: i.message,
        code: i.code,
      };
    }),
  };
};

export type ValidatePublishableResult = {
  /** False when there are blocking {@link issues} (empty flow or no completion path). */
  ok: boolean;
  /** Blocking publish issues. */
  issues: ManifestValidationIssue[];
  /**
   * Non-blocking notices (e.g. screens not on any path from entry). The runtime
   * only serves the reachable subgraph; orphans stay in the draft but are not shown.
   */
  warnings: ManifestValidationIssue[];
};

/** Publish-time gate. Runs semantic checks beyond the schema. */
export const validatePublishable = (manifest: FlowManifest): ValidatePublishableResult => {
  const issues: ManifestValidationIssue[] = [];
  const warnings: ManifestValidationIssue[] = [];

  if (manifest.screens.length === 0) {
    issues.push({
      path: ['screens'],
      message: 'flow must have at least one screen',
      code: 'flow.no_screens',
    });
  }

  if (manifest.entryScreenId == null && manifest.screens.length > 0) {
    issues.push({
      path: ['entryScreenId'],
      message:
        'flow entry is not connected — connect the entry node on the canvas to a screen, decision, or integration step before publishing',
      code: 'flow.no_entry',
    });
  }

  const screenMap = new Map(
    manifest.screens.map((s) => [s.id, s as unknown as Screen] as const),
  );
  const decisionMap = new Map((manifest.decisionNodes ?? []).map((d) => [d.id, d] as const));
  const surfaceMap = new Map((manifest.externalSurfaceNodes ?? []).map((s) => [s.id, s] as const));

  const enqueueGraphNode = (t: string | null | undefined): void => {
    if (t === null || t === undefined) return;
    if (screenMap.has(t) || decisionMap.has(t) || surfaceMap.has(t)) {
      queue.push(t);
    }
  };

  // Reachability: BFS from entry across screens, decision vertices, and external surfaces (e.g. RevenueCat paywall).
  const reachable = new Set<string>();
  const queue: string[] = [];
  if (manifest.entryScreenId != null) {
    queue.push(manifest.entryScreenId);
  }
  let canTerminate = false;
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);

    const decision = decisionMap.get(id);
    if (decision) {
      for (const c of decision.cases) {
        if (c.next != null) enqueueGraphNode(c.next);
      }
      if (decision.elseNext != null) enqueueGraphNode(decision.elseNext);
      continue;
    }

    const surface = surfaceMap.get(id);
    if (surface) {
      const outcomeTargets = Object.values(surface.outcomes);
      if (
        outcomeTargets.some((t) => t === EXTERNAL_SURFACE_NO_NEXT) ||
        surface.fallback === EXTERNAL_SURFACE_NO_NEXT
      ) {
        canTerminate = true;
      }
      if (surface.fallback != null && surface.fallback !== EXTERNAL_SURFACE_NO_NEXT) {
        enqueueGraphNode(surface.fallback);
      }
      for (const t of outcomeTargets) {
        if (t != null && t !== EXTERNAL_SURFACE_NO_NEXT) enqueueGraphNode(t);
      }
      continue;
    }

    const screen = screenMap.get(id);
    if (!screen) continue;
    const targets: (string | null)[] = [];
    targets.push(screen.next.default);
    const input = findInputLayer(screen);
    if (
      input &&
      (input.kind === 'single_choice' || input.kind === 'multiple_choice') &&
      input.branching.enabled
    ) {
      for (const c of input.branching.conditions) targets.push(c.goTo);
    }
    walkScreen(screen, (l) => {
      if (l.kind === 'button' && l.action.kind === 'go_to_step') {
        targets.push(l.action.screenId);
      }
      if (l.kind === 'button' && l.action.kind === 'end_flow') {
        targets.push(null);
      }
      if (l.kind === 'button' && l.action.kind === 'request_app_review') {
        targets.push(screen.next.default);
      }
      if (l.kind === 'button' && l.action.kind === 'request_os_permission') {
        const o = l.action.outcomes;
        for (const t of [o.granted, o.denied, o.blocked]) {
          if (t === OS_PERMISSION_OUTCOME_END) {
            targets.push(null);
          } else if (t === OS_PERMISSION_OUTCOME_CONTINUE) {
            targets.push(screen.next.default);
          } else {
            targets.push(t);
          }
        }
      }
      if (l.kind === 'button' && l.action.kind === 'go_back_one_screen' && l.action.fallbackScreenId) {
        targets.push(l.action.fallbackScreenId);
      }
      if (l.kind === 'back_button' && l.fallbackScreenId) {
        targets.push(l.fallbackScreenId);
      }
    });
    if (targets.every((t) => t === null || t === undefined)) {
      canTerminate = true;
    }
    for (const t of targets) {
      if (t === null || t === undefined) {
        canTerminate = true;
      } else {
        enqueueGraphNode(t);
      }
    }
  }

  if (manifest.entryScreenId != null && !canTerminate) {
    issues.push({
      path: ['screens'],
      message: 'no path from entry screen reaches completion',
      code: 'flow.no_completion_path',
    });
  }

  for (const screen of manifest.screens) {
    if (manifest.entryScreenId != null && !reachable.has(screen.id)) {
      warnings.push({
        stepId: screen.id,
        path: ['screens', screen.id],
        message: `screen "${screen.id}" is not reachable from entry`,
        code: 'screen.unreachable',
      });
    }
  }

  for (const sn of manifest.externalSurfaceNodes ?? []) {
    if (manifest.entryScreenId != null && !reachable.has(sn.id)) {
      warnings.push({
        stepId: null,
        path: ['externalSurfaceNodes', sn.id],
        message: `external surface "${sn.name ?? sn.id}" is not reachable from entry`,
        code: 'external_surface.unreachable',
      });
    }
  }

  for (const dn of manifest.decisionNodes ?? []) {
    if (manifest.entryScreenId != null && !reachable.has(dn.id)) {
      warnings.push({
        stepId: null,
        path: ['decisionNodes', dn.id],
        message: `decision "${dn.id}" is not reachable from entry`,
        code: 'decision.unreachable',
      });
    }
    for (const c of dn.cases) {
      if (c.next == null) {
        issues.push({
          stepId: null,
          path: ['decisionNodes', dn.id, 'cases', c.id],
          message: `decision "${dn.id}" segment "${c.name ?? c.id}" must have a next step before publishing`,
          code: 'decision.incomplete_branches',
        });
      }
    }
    if (dn.elseNext == null) {
      issues.push({
        stepId: null,
        path: ['decisionNodes', dn.id, 'elseNext'],
        message: `decision "${dn.id}" needs an "everyone else" branch connected before publishing`,
        code: 'decision.incomplete_branches',
      });
    }
  }

  return { ok: issues.length === 0, issues, warnings };
};
