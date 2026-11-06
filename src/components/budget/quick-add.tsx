import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import type { Budget } from '@/hooks/use-budget'
import { envEmoji, fmt, num, spentBy } from '@/lib/budget'
import { cn } from '@/lib/utils'

const STEPS = [50, 100, 200, 500]

function useWide() {
  const q = '(min-width: 768px)'
  const [wide, setWide] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

/** Fast cash entry: amount first, one tap on a category, who paid, save. Dialog on wide screens, drawer on phones. */
export function QuickAdd({ b, open, onOpenChange }: { b: Budget; open: boolean; onOpenChange: (v: boolean) => void }) {
  const wide = useWide()
  const title = 'Нова витрата'
  const hint = 'Готівка або те, чого немає в monobank'
  const body = <QuickAddForm b={b} onDone={() => onOpenChange(false)} />

  if (wide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-5 rounded-3xl p-6 sm:max-w-[34rem]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{hint}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92svh]">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{hint}</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{body}</div>
      </DrawerContent>
    </Drawer>
  )
}

function QuickAddForm({ b, onDone }: { b: Budget; onDone: () => void }) {
  const { state, c } = b
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [who, setWho] = useState(state.people[0] || 'Я')
  const [env, setEnv] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const spent = useMemo(() => spentBy(state), [state])

  // Most-used categories first, then the rest of daily and personal spending.
  const envs = useMemo(() => {
    const count: Record<string, number> = {}
    for (const x of state.expenses) count[x.env] = (count[x.env] || 0) + 1
    return state.envelopes
      .filter((e) => e.group === 'daily' || e.group === 'personal')
      .sort((a, b2) => (count[b2.id] || 0) - (count[a.id] || 0))
  }, [state.envelopes, state.expenses])

  const a = num(amount)
  const picked = envs.find((e) => e.id === env)
  const leftNow = picked ? (c.plan[picked.id] || 0) - (spent[picked.id] || 0) : 0
  const ready = !!picked && a > 0 && !busy

  const save = async () => {
    if (!ready) return
    setBusy(true)
    try {
      if (await b.addExpense(picked!.id, a, note.trim(), who)) {
        setAmount(''); setNote(''); setEnv(null)
        onDone()
      }
    } finally { setBusy(false) }
  }

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void save() }}>
      {/* Amount */}
      <div className="space-y-3">
        <label className="flex items-baseline justify-center gap-2 rounded-2xl bg-muted/60 px-4 py-4">
          <span className="sr-only">Сума</span>
          <input autoFocus inputMode="decimal" placeholder="0" value={amount} aria-label="Сума"
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
            style={{ width: `${Math.max(1, amount.length || 1) + 0.5}ch` }}
            className="num min-w-[2ch] max-w-full bg-transparent text-right text-5xl font-semibold outline-none placeholder:text-muted-foreground/40" />
          <span className="text-2xl text-muted-foreground">грн</span>
        </label>
        <div className="flex justify-center gap-2">
          {STEPS.map((s) => (
            <button key={s} type="button" onClick={() => setAmount(String(Math.round((a + s) * 100) / 100))}
              className="num rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
              +{s}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-medium text-muted-foreground">Стаття</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {envs.map((e) => {
            const left = (c.plan[e.id] || 0) - (spent[e.id] || 0)
            const on = env === e.id
            return (
              <button key={e.id} type="button" onClick={() => setEnv(e.id)} aria-pressed={on}
                className={cn('flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors',
                  on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'bg-card hover:bg-muted')}>
                <span className="text-base leading-none" aria-hidden>{envEmoji(e)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{e.name}</span>
                  <span className={cn('num block truncate text-[11px]', left < 0 ? 'text-destructive' : 'text-muted-foreground')}>{fmt(left)}</span>
                </span>
              </button>
            )
          })}
        </div>
        {picked && a > 0 && (
          <p className="text-xs text-muted-foreground">
            У «{picked.name}» лишиться <b className={cn('num font-semibold', leftNow - a < 0 ? 'text-destructive' : 'text-foreground')}>{fmt(leftNow - a)}</b>
            {leftNow - a < 0 && ' — перевитрату можна буде перекрити на вкладці «Витрати»'}
          </p>
        )}
      </fieldset>

      {/* Who and note */}
      <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
        <div role="radiogroup" aria-label="Хто витратив" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {state.people.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={who === p} onClick={() => setWho(p)}
              className={cn('h-8 rounded-lg px-4 text-sm transition-colors', who === p ? 'bg-card font-medium text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground')}>
              {p}
            </button>
          ))}
        </div>
        <Input placeholder="Коментар (необов'язково)" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} className="h-10 rounded-xl" />
      </div>

      {/* Phones: the button stays at the bottom of the drawer while the list scrolls. */}
      <div className="sticky bottom-0 -mx-4 bg-linear-to-t from-popover from-70% to-transparent px-4 pb-1 pt-4 md:static md:mx-0 md:bg-none md:p-0">
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={!ready}>
          {!a ? 'Введіть суму' : !picked ? 'Оберіть статтю' : `Записати ${fmt(a)}`}
        </Button>
      </div>
    </form>
  )
}
