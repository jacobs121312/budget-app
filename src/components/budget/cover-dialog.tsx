import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Budget } from '@/hooks/use-budget'
import { envEmoji, fmt, num, spentBy } from '@/lib/budget'
import type { Envelope } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * YNAB-style "cover overspending": raise the overspent envelope's limit and take the same
 * amount from an envelope that still has money this month (or from the "rest" savings goal).
 */
export function CoverDialog({ b, target, onClose }: { b: Budget; target: Envelope | null; onClose: () => void }) {
  const { state, c } = b
  const spent = spentBy(state)
  const over = target ? Math.max(0, (spent[target.id] || 0) - (c.plan[target.id] || 0)) : 0
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState<string | null>(null)

  const sources = state.envelopes
    .filter((e) => target && e.id !== target.id && (e.group === 'daily' || e.group === 'personal' || (e.group === 'goals' && e.type === 'rest')))
    .map((e) => ({ e, free: (c.plan[e.id] || 0) - (e.group === 'goals' ? 0 : spent[e.id] || 0) }))
    .filter((x) => x.free > 0.5)
    .sort((a, b) => (a.e.type === 'rest' ? -1 : b.e.type === 'rest' ? 1 : b.free - a.free))

  const sum = num(amount) || over
  const apply = () => {
    if (!target || !from || !(sum > 0)) return
    b.update((d) => {
      const t = d.envelopes.find((x) => x.id === target.id)!
      const s = d.envelopes.find((x) => x.id === from)!
      // Limits become plain hryvnia amounts so the move is exact.
      t.value = Math.round((c.plan[t.id] || 0) + sum); t.type = 'uah'
      if (s.type !== 'rest') { s.value = Math.max(0, Math.round((c.plan[s.id] || 0) - sum)); s.type = 'uah' }
    })
    setAmount(''); setFrom(null); onClose()
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setAmount(''); setFrom(null); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перекрити перевитрату</DialogTitle>
          <DialogDescription>
            {target && <>«{target.name}» перевитрачено на <b className="text-foreground">{fmt(over)}</b>. Звідки взяти гроші? Ліміт цієї статті збільшиться, а обраної — зменшиться на ту саму суму.</>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="number" inputMode="decimal" placeholder={String(Math.round(over))} value={amount} onChange={(e) => setAmount(e.target.value)} className="text-right font-semibold tabular-nums" aria-label="Сума" />
          <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
            {!sources.length && <p className="text-sm text-muted-foreground">Немає статей з вільними грошима цього місяця.</p>}
            {sources.map(({ e, free }) => (
              <button key={e.id} type="button" onClick={() => setFrom(e.id)} disabled={free < sum - 0.5}
                className={cn('flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-40', from === e.id ? 'border-primary bg-primary/10' : 'hover:bg-muted')}>
                <span>{envEmoji(e)} {e.name}{e.type === 'rest' && <span className="ml-1 text-xs text-muted-foreground">(решта)</span>}</span>
                <span className="tabular-nums text-muted-foreground">вільно {fmt(free)}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Ліміти змінюються в плані — наступного місяця їх можна повернути на вкладці «План».</p>
        </div>
        <DialogFooter>
          <Button disabled={!from || !(sum > 0)} onClick={apply}>Перекрити {fmt(sum)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
