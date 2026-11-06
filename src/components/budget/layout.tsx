import type { GroupId } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Phones: one column (side cards, then main; a card can move itself with `order-last`).
 * Wide screens: a side column next to the main area.
 */
export function Columns({ side, main, stickySide = false, sideRight = false }: { side: React.ReactNode; main: React.ReactNode; stickySide?: boolean; sideRight?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-4 lg:grid lg:items-start lg:gap-5', sideRight ? 'lg:grid-cols-[minmax(0,1fr)_400px]' : 'lg:grid-cols-[380px_minmax(0,1fr)]')}>
      <div className={cn('contents lg:flex lg:flex-col lg:gap-4', stickySide && 'lg:sticky lg:top-24', sideRight && 'lg:order-last')}>{side}</div>
      <div className="contents lg:block lg:min-w-0">{main}</div>
    </div>
  )
}

export function Step({ n }: { n: number }) {
  return (
    <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground align-[1px]">
      {n}
    </span>
  )
}

/** Group titles stay neutral; colour is kept for bars, so the page reads calm (one accent). */
export const groupAccent: Record<GroupId, string> = {
  fixed: 'text-foreground',
  debts: 'text-foreground',
  daily: 'text-foreground',
  personal: 'text-foreground',
  goals: 'text-foreground',
}

export const groupBar: Record<GroupId, string> = {
  fixed: '[&>[data-slot=progress-indicator]]:bg-[var(--chart-4)]',
  debts: '[&>[data-slot=progress-indicator]]:bg-[var(--chart-2)]',
  daily: '[&>[data-slot=progress-indicator]]:bg-primary',
  personal: '[&>[data-slot=progress-indicator]]:bg-primary/70',
  goals: '[&>[data-slot=progress-indicator]]:bg-[var(--chart-5)]',
}

/** Solid colours of the groups for the allocation bar (match `groupBar`). */
export const groupFill: Record<GroupId, string> = {
  fixed: 'var(--chart-4)',
  debts: 'var(--chart-2)',
  daily: 'var(--primary)',
  personal: 'color-mix(in srgb, var(--primary) 55%, var(--card))',
  goals: 'var(--chart-5)',
}
