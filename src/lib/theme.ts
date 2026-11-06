// Light / dark / follow the system. The choice lives in this browser only.
export type Theme = 'light' | 'dark' | 'system'
const KEY = 'family-budget-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme(): Theme {
  try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : 'system' } catch { return 'system' }
}

export function applyTheme(t: Theme = getTheme()) {
  const dark = t === 'dark' || (t === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0a0a0a' : '#ffffff')
}

export function setTheme(t: Theme) {
  try { if (t === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t) } catch { /* private mode */ }
  applyTheme(t)
}

media.addEventListener('change', () => applyTheme())
