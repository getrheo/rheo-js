import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Screen } from '@getrheo/contracts/screens';
import { walkScreen } from '@getrheo/flow-runtime/layers';
import type { CheckboxLayer } from '@getrheo/contracts/layers';

const collectCheckboxFieldKeys = (screen: Screen): string[] => {
  const out: string[] = [];
  walkScreen(screen, (l) => {
    if (l.kind === 'checkbox') out.push(l.fieldKey);
  });
  return out;
};

/** True when any `blocking` checkbox on the screen is unchecked. */
export const computeCheckboxContinueBlocked = (
  screen: Screen,
  checked: Record<string, boolean>,
): boolean => {
  let blocked = false;
  walkScreen(screen, (l) => {
    if (l.kind !== 'checkbox' || !l.blocking) return;
    if (!checked[l.fieldKey]) blocked = true;
  });
  return blocked;
};

type ScreenCheckboxAckCtxValue = {
  checked: Record<string, boolean>;
  toggle: (fieldKey: string) => void;
  /** Snapshot all checkbox values on this screen for `screen_commit`. */
  snapshotValues: () => Record<string, boolean>;
  blockingContinue: boolean;
};

const ScreenCheckboxAckCtx = createContext<ScreenCheckboxAckCtxValue | null>(null);

export const ScreenCheckboxAckProvider = ({
  screen,
  children,
}: {
  screen: Screen;
  children: ReactNode;
}) => {
  const keys = useMemo(() => collectCheckboxFieldKeys(screen), [screen]);
  const keysSig = keys.join('\0');

  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(keys.map((k) => [k, false])),
  );

  useEffect(() => {
    setChecked(Object.fromEntries(keys.map((k) => [k, false])));
  }, [screen.id, keysSig]);

  const blockingContinue = useMemo(
    () => computeCheckboxContinueBlocked(screen, checked),
    [screen, checked],
  );

  const toggle = useCallback((fieldKey: string) => {
    setChecked((prev) => ({ ...prev, [fieldKey]: !(prev[fieldKey] ?? false) }));
  }, []);

  const snapshotValues = useCallback((): Record<string, boolean> => {
    const out: Record<string, boolean> = {};
    walkScreen(screen, (l) => {
      if (l.kind === 'checkbox') {
        out[l.fieldKey] = !!checked[l.fieldKey];
      }
    });
    return out;
  }, [screen, checked]);

  const value = useMemo<ScreenCheckboxAckCtxValue>(
    () => ({ checked, toggle, snapshotValues, blockingContinue }),
    [checked, toggle, snapshotValues, blockingContinue],
  );

  return <ScreenCheckboxAckCtx.Provider value={value}>{children}</ScreenCheckboxAckCtx.Provider>;
};

export const useScreenCheckboxAck = (): ScreenCheckboxAckCtxValue | null =>
  useContext(ScreenCheckboxAckCtx);

export const useCheckboxContinueBlocked = (): boolean => {
  const ctx = useContext(ScreenCheckboxAckCtx);
  return ctx?.blockingContinue ?? false;
};

export const listBlockingCheckboxes = (screen: Screen): CheckboxLayer[] => {
  const out: CheckboxLayer[] = [];
  walkScreen(screen, (l) => {
    if (l.kind === 'checkbox' && l.blocking) out.push(l);
  });
  return out;
};
