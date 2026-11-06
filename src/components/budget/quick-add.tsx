import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Budget } from '@/hooks/use-budget'
import { envEmoji, num } from '@/lib/budget'
import { cn } from '@/lib/utils'

/** Fast cash entry (Monefy-style): amount first, then one tap on a category. */
export function QuickAdd({ b, open, onOpenChange }: { b: Budget; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = b
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [who, setWho] = useState(state.people[0] || 'Я')
  const [env, setEnv] = useState<string | null>(null)

  // Most-used categories first, then the rest of daily and personal spending.
  const envs = useMemo(() => {
    const count: Record<string, number> = {}
    for (const x of state.expenses) count[x.env] = (count[x.env] || 0) + 1
    return state.envelopes
      .filter((e) => e.group === 'daily' || e.group === 'personal')
      .sort((a, b) => (count[b.id] || 0) - (count[a.id] || 0))
  }, [state.envelopes, state.expenses])

  const save = async () => {
    const a = num(amount)
    if (!env || a <= 0) return
    if (await b.addExpense(env, a, note.trim(), who)) {
      setAmount(''); setNote(''); setEnv(null)
      onOpenChange(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>Нова витрата</DrawerTitle>
            <DrawerDescription>Готівка або те, чого немає в monobank</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4">
            <div className="flex items-baseline justify-center gap-2">
              <Input autoFocus type="number" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="h-16 w-48 border-0 text-center text-5xl font-bold tabular-nums shadow-none focus-visible:ring-0 md:text-5xl dark:bg-transparent" />
              <span className="text-xl text-muted-foreground">грн</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {envs.map((e) => (
                <button key={e.id} type="button" onClick={() => setEnv(e.id)}
                  className={cn('flex flex-col items-center gap-1 rounded-xl border p-2 text-center text-xs transition-colors', env === e.id ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted')}>
                  <span className="text-xl">{envEmoji(e)}</span>
                  <span className="line-clamp-2 leading-tight">{e.name}</span>
                </button>
              ))}
            </div>
            <Input placeholder="Коментар (необов'язково)" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
            <ToggleGroup type="single" variant="outline" value={who} onValueChange={(v) => v && setWho(v)} className="w-full">
              {state.people.map((p) => <ToggleGroupItem key={p} value={p} className="flex-1">{p}</ToggleGroupItem>)}
            </ToggleGroup>
          </div>
          <DrawerFooter>
            <Button size="lg" disabled={!env || !(num(amount) > 0)} onClick={save}>Записати</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
