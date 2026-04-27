import type { Disposable } from '../browser/events';

export const THEMEATTR = 'data-vscode-theme-kind' as const;

export function readCurrentTheme(): 'light' | 'dark' | 'auto' {
  const raw = document.body?.getAttribute(THEMEATTR);
  if (raw === 'vscode-dark') return 'dark';
  if (raw === 'vscode-light') return 'light';
  return 'auto';
}

function computeThemeColors(): void {
  const body = document.body;
  if (body === null) return;

  const raw = body.getAttribute(THEMEATTR);
  const mapped = raw === 'vscode-dark' ? 'dark' : raw === 'vscode-light' ? 'light' : undefined;

  const html = document.documentElement;
  if (!mapped) {
    if (html.hasAttribute(THEMEATTR)) {
      html.removeAttribute(THEMEATTR);
    }
    return;
  }
  if (html.getAttribute(THEMEATTR) !== mapped) {
    html.setAttribute(THEMEATTR, mapped);
  }
}

export function watchThemeColors(): Disposable {
  const init = () => computeThemeColors();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  const observer = new MutationObserver(computeThemeColors);
  const startObserve = () => {
    observer.observe(document.body, { attributes: true, attributeFilter: [THEMEATTR] });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserve, { once: true });
  } else {
    startObserve();
  }

  return { dispose: () => observer.disconnect() };
}
