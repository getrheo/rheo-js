import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { DecisionExpr, DecisionNode, FlowJumpTarget } from '@getrheo/contracts/decisions';

export type DecisionEvaluationTelemetry = {
  decisionNodeId: string;
  /** Matched segment id, or null when no case matched (else branch). */
  matchedCaseId: string | null;
  clauseDigest: string;
};

export const findDecisionNode = (manifest: FlowManifest, id: string): DecisionNode | undefined =>
  (manifest.decisionNodes ?? []).find((d) => d.id === id);

export const decisionTargetIds = (manifest: FlowManifest): Set<string> =>
  new Set((manifest.decisionNodes ?? []).map((d) => d.id));

const stableSerialize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableSerialize((value as Record<string, unknown>)[k])}`);
  return `{${parts.join(',')}}`;
};

/** Stable digest of the expression shape and literal predicate values (not runtime answers). */
export const digestDecisionExpression = (expr: DecisionExpr): string => {
  const s = stableSerialize(expr);
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33) ^ s.charCodeAt(i)!;
  }
  return `d${(h >>> 0).toString(16)}`;
};

type EvalCtx = {
  locale: string;
  platform: string;
  sdkAttributes: Record<string, unknown>;
  responses: Record<string, unknown>;
};

const responseForField = (
  fieldKey: string,
  responses: Record<string, unknown>,
): unknown => responses[fieldKey];

const normalizeResponseValue = (r: unknown): unknown => {
  if (!r || typeof r !== 'object') return undefined;
  const o = r as Record<string, unknown>;
  switch (o.kind) {
    case 'choice':
      return typeof o.choiceId === 'string' ? o.choiceId : undefined;
    case 'multiChoice':
      return Array.isArray(o.choiceIds) ? o.choiceIds : undefined;
    case 'text':
      return typeof o.value === 'string' ? o.value : undefined;
    case 'scale':
      return typeof o.value === 'number' ? o.value : undefined;
    case 'wheel':
      return typeof o.value === 'string' ? o.value : undefined;
    case 'checkbox':
      return typeof o.value === 'boolean' ? o.value : undefined;
    default:
      return undefined;
  }
};
const normalizeScalarForStringPred = (raw: unknown): string | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return undefined;
};

const normalizeNumber = (raw: unknown): number | undefined => {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return raw;
};

const normalizeChoiceId = (raw: unknown): string | undefined =>
  typeof raw === 'string' && raw.length > 0 ? raw : undefined;

const normalizeChoiceIds = (raw: unknown): string[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
  return ids;
};

const normalizeBoolean = (raw: unknown): boolean | undefined => {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw !== 0;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  return undefined;
};

type PredicateVariable = Extract<DecisionExpr, { kind: 'predicate' }>['variable'];

const resolveVariableValue = (variable: PredicateVariable, ctx: EvalCtx): unknown => {
  if (variable.kind === 'builtin') {
    if (variable.name === 'locale') return ctx.locale;
    return ctx.platform;
  }
  if (variable.kind === 'sdk') return ctx.sdkAttributes[variable.key];
  const r = responseForField(variable.fieldKey, ctx.responses);
  return normalizeResponseValue(r);
};

const evalStringPred = (left: string, pred: { op: string; value: string }): boolean => {
  switch (pred.op) {
    case 'eq':
      return left === pred.value;
    case 'neq':
      return left !== pred.value;
    case 'contains':
      return left.includes(pred.value);
    default:
      return false;
  }
};

const evalNumberPred = (left: number, pred: { op: string; value: number }): boolean => {
  switch (pred.op) {
    case 'eq':
      return left === pred.value;
    case 'neq':
      return left !== pred.value;
    case 'lt':
      return left < pred.value;
    case 'lte':
      return left <= pred.value;
    case 'gt':
      return left > pred.value;
    case 'gte':
      return left >= pred.value;
    default:
      return false;
  }
};

const evalChoicePred = (
  choiceId: string,
  pred:
    | { op: 'eq'; optionId: string }
    | { op: 'one_of'; optionIds: string[] },
): boolean => {
  if (pred.op === 'eq') return choiceId === pred.optionId;
  return pred.optionIds.includes(choiceId);
};

const setIntersect = (a: string[], b: string[]): string[] => {
  const bs = new Set(b);
  return a.filter((x) => bs.has(x));
};

const evalBooleanPred = (
  left: boolean,
  pred: { op: 'eq' | 'neq'; value: boolean },
): boolean => {
  if (pred.op === 'eq') return left === pred.value;
  return left !== pred.value;
};

const evalMultiPred = (
  selected: string[],
  pred:
    | { op: 'intersects'; optionIds: string[] }
    | { op: 'contains_all'; optionIds: string[] }
    | { op: 'subset_of'; optionIds: string[] },
): boolean => {
  const required = pred.optionIds;
  switch (pred.op) {
    case 'intersects':
      return setIntersect(selected, required).length > 0;
    case 'contains_all': {
      const sel = new Set(selected);
      return required.every((id) => sel.has(id));
    }
    case 'subset_of': {
      const allow = new Set(required);
      return selected.every((id) => allow.has(id));
    }
    default:
      return false;
  }
};

export const evaluateDecisionExpression = (expr: DecisionExpr, ctx: EvalCtx): boolean => {
  if (expr.kind === 'empty') return false;
  if (expr.kind === 'group') {
    if (expr.op === 'and') {
      for (const c of expr.children) {
        if (!evaluateDecisionExpression(c, ctx)) return false;
      }
      return true;
    }
    for (const c of expr.children) {
      if (evaluateDecisionExpression(c, ctx)) return true;
    }
    return false;
  }

  const raw = resolveVariableValue(expr.variable, ctx);
  const { predicate } = expr;

  switch (predicate.type) {
    case 'string': {
      const s = normalizeScalarForStringPred(raw);
      if (s === undefined) return false;
      return evalStringPred(s, predicate.pred);
    }
    case 'number': {
      const n = normalizeNumber(raw);
      if (n === undefined) return false;
      return evalNumberPred(n, predicate.pred);
    }
    case 'choice': {
      const id = normalizeChoiceId(raw);
      if (!id) return false;
      return evalChoicePred(id, predicate.pred);
    }
    case 'multi': {
      const ids = normalizeChoiceIds(raw);
      if (!ids) return false;
      return evalMultiPred(ids, predicate.pred);
    }
    case 'boolean': {
      const b = normalizeBoolean(raw);
      if (b === undefined) return false;
      return evalBooleanPred(b, predicate.pred);
    }
    default:
      return false;
  }
};

export const evaluateDecisionNode = (
  node: DecisionNode,
  ctx: EvalCtx,
): { matchedCaseId: string | null; next: FlowJumpTarget; clauseDigest: string } => {
  for (const c of node.cases) {
    if (evaluateDecisionExpression(c.expression, ctx)) {
      return {
        matchedCaseId: c.id,
        next: c.next,
        clauseDigest: digestDecisionExpression(c.expression),
      };
    }
  }
  return {
    matchedCaseId: null,
    next: node.elseNext,
    clauseDigest: 'else',
  };
};
