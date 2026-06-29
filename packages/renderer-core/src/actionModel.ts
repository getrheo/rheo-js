import type { ButtonAction } from '@getrheo/contracts/layers';

export type RendererActionMode = 'interactive' | 'static' | 'native';

export type RendererButtonActionModel = {
  actionKind: ButtonAction['kind'];
  submitsScreen: boolean;
  recordsSkip: boolean;
  terminal: boolean;
  navigates: boolean;
  requestsPermission: boolean;
  requestsAppReview: boolean;
  disabled: boolean;
  disabledReasons: string[];
};

export const rendererButtonActionModel = ({
  action,
  mode,
  checkboxContinueBlocked = false,
  inputDraftInvalid = false,
  nativePermissionAvailable = true,
}: {
  action: ButtonAction;
  mode: RendererActionMode;
  checkboxContinueBlocked?: boolean;
  inputDraftInvalid?: boolean;
  nativePermissionAvailable?: boolean;
}): RendererButtonActionModel => {
  const disabledReasons: string[] = [];
  if (mode === 'static') disabledReasons.push('static-mode');
  if (action.kind === 'continue' && checkboxContinueBlocked) disabledReasons.push('checkbox-blocked');
  if (action.kind === 'continue' && inputDraftInvalid) disabledReasons.push('input-invalid');
  if (mode === 'native' && action.kind === 'request_os_permission' && !nativePermissionAvailable) {
    disabledReasons.push('native-permission-unavailable');
  }

  return {
    actionKind: action.kind,
    submitsScreen: action.kind === 'continue',
    recordsSkip: action.kind === 'skip',
    terminal: action.kind === 'end_flow',
    navigates: action.kind === 'go_to_step' || action.kind === 'go_back_one_screen',
    requestsPermission: action.kind === 'request_os_permission',
    requestsAppReview: action.kind === 'request_app_review',
    disabled: disabledReasons.length > 0,
    disabledReasons,
  };
};
