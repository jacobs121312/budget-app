import type { GroupId } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Phones: one column (side cards, then main; a card can move itself with `order-last`).
 * Wide screens: a side column next to the main area.
 */
export function Columns({ side, main, stickySide = false }: { side: React.ReactNode; main: React.ReactNode; stickySide?: boolean }) {
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div className={cn('contents lg:flex lg:flex-col lg:gap-4', stickySide && 'lg:sticky lg:top-24')}>{side}</div>
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

export const groupAccent: Record<GroupId, string> = {
  fixed: 'text-blue-600 dark:text-blue-400',
  debts: 'text-red-600 dark:text-red-400',
  daily: 'text-violet-600 dark:text-violet-400',
  personal: 'text-amber-600 dark:text-amber-400',
  goals: 'text-emerald-600 dark:text-emerald-400',
}

export const groupBar: Record<GroupId, string> = {
  fixed: '[&>[data-slot=progress-indicator]]:bg-blue-500',
  debts: '[&>[data-slot=progress-indicator]]:bg-red-500',
  daily: '[&>[data-slot=progress-indicator]]:bg-violet-500',
  personal: '[&>[data-slot=progress-indicator]]:bg-amber-500',
  goals: '[&>[data-slot=progress-indicator]]:bg-emerald-500',
}
