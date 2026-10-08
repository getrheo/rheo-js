const hashRoute = (hash: string, prefix: '#!/' | '#/'): string | null => {
  if (!hash.startsWith(prefix)) return null;
  const route = hash.slice(prefix.length - 1).split('?')[0] ?? '';
  if (!route) return '/';
  return route.startsWith('/') ? route : `/${route}`;
};

/** Current document path, used as the `page_view` name. A `#/` hash route replaces the pathname. */
export const currentPageName = (): string => {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname || '/';
  const hash = window.location.hash;
  return hashRoute(hash, '#!/') ?? hashRoute(hash, '#/') ?? path;
};

/**
 * Emits the current path, then again on history changes.
 * Restores `pushState` and `replaceState` on cleanup.
 */
export const installWebPageViewListener = (onPage: (path: string) => void): (() => void) => {
  if (typeof window === 'undefined' || typeof history === 'undefined') return () => undefined;
  let last = '';
  const emit = () => {
    const path = currentPageName();
    if (!path || path === last) return;
    last = path;
    onPage(path);
  };
  emit();
  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);
  history.pushState = ((...args: Parameters<History['pushState']>) => {
    originalPush(...args);
    emit();
  }) as History['pushState'];
  history.replaceState = ((...args: Parameters<History['replaceState']>) => {
    originalReplace(...args);
    emit();
  }) as History['replaceState'];
  window.addEventListener('popstate', emit);
  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener('popstate', emit);
  };
};
