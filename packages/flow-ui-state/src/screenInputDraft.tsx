import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Screen } from '@getrheo/contracts/screens';
import { findInputLayer } from '@getrheo/flow-runtime/layers';
import { screenHasContinueButton } from '@getrheo/flow-runtime';
import { snapScaleValue, scaleValueInRange, scaleValueIsOnStep } from '@getrheo/flow-runtime/scaleValidation';
import { defaultWheelPickerValue, wheelPickerValueIsValid } from '@getrheo/flow-runtime/wheelPickerItems';
import { validateTextInputValue } from '@getrheo/flow-runtime/textInputValidation';
import type { StepResponseCore } from '@getrheo/flow-runtime/stateMachine';

/**
 * In-progress draft value for the screen's lone input layer. Mirrors the
 * `StepResponse` variants the input layers used to emit themselves but
 * without the `text`'s `classification` (added at submit time from the
 * input layer's own `classification`).
 */
export type InputDraft =
  | { kind: 'choice'; choiceId: string }
  | { kind: 'multiChoice'; choiceIds: string[] }
  | { kind: 'text'; value: string }
  | { kind: 'scale'; value: number }
  | { kind: 'wheel'; value: string };

export type InputValidity = { valid: boolean; reason?: string };

type ScreenInputDraftCtxValue = {
  draft: InputDraft | null;
  setDraft: (next: InputDraft | null) => void;
  validity: InputValidity;
  /**
   * Materialise the current draft into a `StepResponseCore` ready to be
   * fed into the host flow's state machine (or wrapped in `screen_commit`).
   * Returns `null` when the draft is empty or the screen has no input.
   */
  toResponse: () => StepResponseCore | null;
};

const ScreenInputDraftCtx = createContext<ScreenInputDraftCtxValue | null>(null);

/**
 * Compute validity for a draft against the screen's input layer
 * constraints. Centralised here so web sim and RN SDK stay in lockstep.
 *
 * Exported for unit tests; production code should consume validity via
 * `useScreenInputValidity()`.
 */
export const computeValidity = (screen: Screen, draft: InputDraft | null): InputValidity => {
  const input = findInputLayer(screen);
  if (!input) return { valid: true };

  const manualSubmit = screenHasContinueButton(screen);
  if (!manualSubmit) return { valid: true };

  if (!draft) {
    if (input.kind === 'text_input' && input.required === false) {
      return { valid: true };
    }
    return { valid: false, reason: 'No input provided yet' };
  }

  switch (input.kind) {
    case 'text_input': {
      if (draft.kind !== 'text') return { valid: false, reason: 'Wrong draft kind' };
      const v = validateTextInputValue(input, draft.value);
      return v.ok ? { valid: true } : { valid: false, reason: v.reason };
    }
    case 'scale_input': {
      if (draft.kind !== 'scale') return { valid: false, reason: 'Wrong draft kind' };
      if (!scaleValueInRange(input, draft.value)) {
        return { valid: false, reason: 'Value out of range' };
      }
      if (!scaleValueIsOnStep(input, draft.value)) {
        return { valid: false, reason: 'Value does not align with step' };
      }
      return { valid: true };
    }
    case 'multiple_choice': {
      if (draft.kind !== 'multiChoice') return { valid: false, reason: 'Wrong draft kind' };
      const min = input.minSelections ?? 1;
      if (draft.choiceIds.length < min) {
        return { valid: false, reason: `Select at least ${min}` };
      }
      const max = input.maxSelections;
      if (max !== undefined && draft.choiceIds.length > max) {
        return { valid: false, reason: `Select at most ${max}` };
      }
      return { valid: true };
    }
    case 'single_choice': {
      if (draft.kind !== 'choice') return { valid: false, reason: 'Wrong draft kind' };
      return { valid: true };
    }
    case 'wheel_picker': {
      if (draft.kind !== 'wheel') return { valid: false, reason: 'Wrong draft kind' };
      if (!wheelPickerValueIsValid(input, draft.value, 'en')) {
        return { valid: false, reason: 'Invalid selection' };
      }
      return { valid: true };
    }
  }
};

/**
 * Convert a draft to a fully-populated `StepResponseCore` using the screen's
 * input layer for context (e.g. text classification).
 *
 * Exported for unit tests; production code should call `toResponse()`
 * from the context value.
 */
export const draftToResponse = (
  screen: Screen,
  draft: InputDraft | null,
): StepResponseCore | null => {
  const input = findInputLayer(screen);
  if (!draft) {
    if (input?.kind === 'text_input' && input.required === false) {
      return { kind: 'text', value: '', classification: input.classification };
    }
    return null;
  }
  if (!input) return null;

  if (draft.kind === 'choice') return { kind: 'choice', choiceId: draft.choiceId };
  if (draft.kind === 'multiChoice') return { kind: 'multiChoice', choiceIds: draft.choiceIds };
  if (draft.kind === 'text') {
    if (input.kind !== 'text_input') return null;
    return { kind: 'text', value: draft.value, classification: input.classification };
  }
  if (draft.kind === 'scale') {
    if (input.kind !== 'scale_input') return null;
    return { kind: 'scale', value: draft.value };
  }
  if (draft.kind === 'wheel') {
    if (input.kind !== 'wheel_picker') return null;
    return { kind: 'wheel', value: draft.value };
  }
  return null;
};

const initialDraftForScreen = (screen: Screen): InputDraft | null => {
  const input = findInputLayer(screen);
  if (input?.kind === 'scale_input') {
    return {
      kind: 'scale',
      value: snapScaleValue(input, input.defaultValue ?? input.min),
    };
  }
  if (input?.kind === 'wheel_picker') {
    const value = defaultWheelPickerValue(input);
    return value ? { kind: 'wheel', value } : null;
  }
  return null;
};

export const ScreenInputDraftProvider = ({
  screen,
  children,
}: {
  screen: Screen;
  children: ReactNode;
}) => {
  const [draft, setDraft] = useState<InputDraft | null>(() => initialDraftForScreen(screen));

  useEffect(() => {
    setDraft(initialDraftForScreen(screen));
  }, [screen.id]);

  const validity = useMemo(() => computeValidity(screen, draft), [screen, draft]);
  const toResponse = useCallback(() => draftToResponse(screen, draft), [screen, draft]);

  const value = useMemo<ScreenInputDraftCtxValue>(
    () => ({ draft, setDraft, validity, toResponse }),
    [draft, validity, toResponse],
  );

  return <ScreenInputDraftCtx.Provider value={value}>{children}</ScreenInputDraftCtx.Provider>;
};

/**
 * Read the screen-level input draft. Returns `null` when called outside
 * a `ScreenInputDraftProvider` so consumers can degrade gracefully
 * (e.g. when an input view is rendered standalone in a builder preview).
 */
export const useScreenInputDraft = (): ScreenInputDraftCtxValue | null =>
  useContext(ScreenInputDraftCtx);

/**
 * Convenience hook for callers that only care whether the current
 * screen's input is in a submittable state. Treats absence of a
 * provider as "valid" so non-input screens (or standalone previews)
 * never block submission.
 */
export const useScreenInputValidity = (): InputValidity => {
  const ctx = useContext(ScreenInputDraftCtx);
  return ctx?.validity ?? { valid: true };
};
