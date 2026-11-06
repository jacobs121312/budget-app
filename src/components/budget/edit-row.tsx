import { PiggyBank, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = { uah: 'грн', usd: '$', percent: '%', rest: 'решта' }

/** One editable line of the plan: name, how the amount is set, the amount, extras below. */
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
}) {
  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5">
        {props.emoji && <span className="text-base leading-none" aria-hidden>{props.emoji}</span>}
        <Input
          value={props.name}
          placeholder="Назва"
          onChange={(e) => props.onName(e.target.value)}
          className="h-8 border-transparent bg-transparent px-0 text-[15px] font-medium shadow-none hover:border-input hover:px-2 focus-visible:border-input focus-visible:px-2 dark:bg-transparent"
        />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={props.type}
            onValueChange={(t) => t && props.onType(t)}
          >
            {props.types.map((t) => (
              <ToggleGroupItem key={t} value={t} className="h-7 px-2 text-xs" aria-label={TYPE_LABELS[t]}>
                {TYPE_LABELS[t]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {props.jar && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <PiggyBank className="size-3" /> банка
            </span>
          )}
          {props.hint && (
            <span className={cn('truncate text-xs tabular-nums', props.hintTone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
              {props.hint}
            </span>
          )}
        </div>
        {props.children}
      </div>
      {props.type === 'rest' ? (
        <span className="w-24 pt-1.5 text-right text-xs text-muted-foreground">авто</span>
      ) : (
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          aria-label="Сума"
          value={props.value}
          onChange={(e) => props.onValue(Number(e.target.value.replace(',', '.')) || 0)}
          className="h-8 w-24 text-right font-semibold tabular-nums"
        />
      )}
      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Видалити" onClick={props.onRemove}>
        <X className="size-4" />
      </Button>
    </div>
  )
}

/** Small labelled number field used under a row (debt left, payment day, goal amount…). */
export function MiniField(props: { label: string; value: string | number; onChange: (v: string) => void; type?: string; width?: string; placeholder?: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {props.label}
      <Input
        type={props.type || 'number'}
        inputMode={props.type === 'month' ? undefined : 'decimal'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className={cn('h-7 px-2 text-right text-xs font-semibold tabular-nums', props.width || 'w-24')}
      />
    </label>
  )
}
