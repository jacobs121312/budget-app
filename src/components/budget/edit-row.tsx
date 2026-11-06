import { useState } from 'react'
import { ChevronDown, PiggyBank, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = { uah: 'грн', usd: '$', percent: '%', rest: 'решта' }
const TYPE_HINTS: Record<string, string> = { uah: 'сума в гривнях', usd: 'сума в доларах', percent: 'відсоток', rest: 'усе, що лишилось' }

/**
 * One editable line of the plan, in a single row: name · unit · amount · remove.
 * Under it: a one-line summary (`children`) and, behind a chevron, extra fields (`details`).
 */
export function EditRow(props: {
  name: string
  type: string
  value: number
  types: string[]
  hint?: string
  hintTone?: 'muted' | 'good'
  jar?: boolean
  emoji?: string
  onName: (v: string) => void
  onType: (t: string) => void
  onValue: (v: number) => void
  onRemove: () => void
  children?: React.ReactNode
  details?: React.ReactNode
  /** Open the details at first (e.g. a new debt that still needs its numbers). */
  detailsOpen?: boolean
}) {
  const [open, setOpen] = useState(!!props.detailsOpen)
  const chips = (props.jar || (props.hint && props.type !== 'rest')) && (
    <>
      {props.jar && (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <PiggyBank className="size-3" /> банка
        </span>
      )}
      {props.hint && props.type !== 'rest' && (
        <span className={cn('text-xs tabular-nums', props.hintTone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{props.hint}</span>
      )}
    </>
  )
  const pad = props.emoji ? 'pl-7' : 'pl-1'
  return (
    <div className="group/row @container border-b py-2.5 last:border-b-0">
      {/* Narrow card: name on the first line, unit and amount on the second. Wide card: one line. */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {props.emoji && <span className="w-5 shrink-0 text-center text-base leading-none" aria-hidden>{props.emoji}</span>}
        <Input
          value={props.name}
          placeholder="Назва"
          onChange={(e) => props.onName(e.target.value)}
          className="h-9 min-w-0 flex-1 border-transparent bg-transparent px-1 text-[15px] font-medium shadow-none hover:border-input focus-visible:border-input dark:bg-transparent"
        />
        <div className={cn('order-last flex w-full items-center gap-1.5 @lg:order-none @lg:w-auto', pad, '@lg:pl-0')}>
          <div className="mr-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 @lg:hidden">{chips}</div>
          <Select value={props.type} onValueChange={props.onType}>
            <SelectTrigger aria-label="Як задано суму" className="w-20 shrink-0 px-2 text-xs data-[size=default]:h-9">
              <SelectValue>{TYPE_LABELS[props.type]}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {props.types.map((t) => (
                <SelectItem key={t} value={t} className="text-sm">
                  <span className="w-9 font-semibold">{TYPE_LABELS[t]}</span>
                  <span className="text-muted-foreground">{TYPE_HINTS[t]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {props.type === 'rest' ? (
            <span className="flex h-9 w-24 shrink-0 items-center justify-end rounded-md bg-emerald-500/10 px-2 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {props.hint?.replace(/^=\s*/, '') || 'авто'}
            </span>
          ) : (
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              aria-label="Сума"
              value={props.value}
              onFocus={(e) => e.target.select()}
              onChange={(e) => props.onValue(Number(e.target.value.replace(',', '.')) || 0)}
              className="h-9 w-24 shrink-0 text-right font-semibold tabular-nums"
            />
          )}
        </div>
        {props.details && (
          <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground @lg:order-first @lg:hidden" aria-label={open ? 'Сховати деталі' : 'Деталі'} aria-expanded={open} onClick={() => setOpen(!open)}>
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100" aria-label="Видалити" onClick={props.onRemove}>
          <X className="size-4" />
        </Button>
      </div>
      {(chips || props.children || props.details) && (
        <div className={cn('mt-1 flex flex-wrap items-center gap-x-2 gap-y-1', pad)}>
          <div className="hidden flex-wrap items-center gap-x-2 gap-y-1 @lg:flex">{chips}</div>
          {props.children}
          {props.details && (
            <button className="ml-auto hidden items-center gap-0.5 text-xs font-medium text-primary @lg:inline-flex" aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? 'Сховати' : 'Змінити'} <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
            </button>
          )}
        </div>
      )}
      {props.details && open && (
        <div className={cn('mt-2 grid grid-cols-2 gap-2.5 rounded-lg bg-muted/60 p-2.5 @lg:flex @lg:flex-wrap @lg:items-center @lg:gap-3', props.emoji ? 'ml-7' : 'ml-1')}>{props.details}</div>
      )}
    </div>
  )
}

/** Small labelled number field used under a row (debt left, payment day, goal amount…). */
export function MiniField(props: { label: string; value: string | number; onChange: (v: string) => void; type?: string; width?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col items-start gap-1 text-xs text-muted-foreground @lg:flex-row @lg:items-center @lg:gap-1.5">
      {props.label}
      <Input
        type={props.type || 'number'}
        inputMode={props.type === 'month' ? undefined : 'decimal'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className={cn('h-9 w-full bg-background px-2 text-right text-sm font-semibold tabular-nums @lg:h-8 @lg:text-xs', props.width || '@lg:w-24')}
      />
    </label>
  )
}
