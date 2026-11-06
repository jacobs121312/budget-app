// Moving between tabs from a widget: switch the tab, then scroll to (and open) a section.
import type { BudgetState } from './types'

export const REVEAL = 'budget:reveal'

/** Scroll to the element with this id; a collapsed section listening for REVEAL opens itself first. */
export function reveal(id: string) {
  window.dispatchEvent(new CustomEvent(REVEAL, { detail: id }))
  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
}

export function goTo(setTab: (t: BudgetState['tab']) => void, tab: BudgetState['tab'], id?: string) {
  setTab(tab)
  if (id) setTimeout(() => reveal(id), 30)
  else window.scrollTo({ top: 0 })
}

/** Props that make a card act as a button (mouse, keyboard, screen readers). */
export function tap(onClick: () => void, label?: string) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onClick() } },
  }
}

/** Look of a clickable card: a ring in the accent on hover, a focus ring for the keyboard. */
export const TAP = 'cursor-pointer transition-[box-shadow,transform] hover:ring-primary/40 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
