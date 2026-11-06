import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Budget } from '@/hooks/use-budget'
import { GROUPS, envEmoji, fmt, num } from '@/lib/budget'

/** Month's records grouped by day (Copilot-style), with search, filters and changing the envelope. */
export function ExpenseList({ b }: { b: Budget }) {
  const { state } = b
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const days = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = [...state.expenses]
      .filter((x) => {
        if (filter === 'card' && x.source !== 'mono') return false
        if (filter === 'cash' && x.source === 'mono') return false
        if (filter.startsWith('who:') && x.who !== filter.slice(4)) return false
        if (!needle) return true
        const env = state.envelopes.find((e) => e.id === x.env)
        return `${x.note} ${env?.name || ''} ${x.who}`.toLowerCase().includes(needle)
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    const byDay = new Map<string, typeof list>()
    for (const x of list) {
      const key = new Date(x.date).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })
      byDay.set(key, [...(byDay.get(key) || []), x])
    }
    return [...byDay.entries()]
  }, [state.expenses, state.envelopes, q, filter])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Усі витрати місяця</CardTitle>
        <CardAction className="text-sm text-muted-foreground">{state.expenses.length || ''}</CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Пошук: магазин, стаття, коментар" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <ToggleGroup type="single" size="sm" variant="outline" value={filter} onValueChange={(v) => setFilter(v || 'all')} className="flex-wrap justify-start">
          <ToggleGroupItem value="all">Усі</ToggleGroupItem>
          {state.people.map((p) => <ToggleGroupItem key={p} value={`who:${p}`}>{p}</ToggleGroupItem>)}
          <ToggleGroupItem value="card">💳 Картка</ToggleGroupItem>
          <ToggleGroupItem value="cash">✍️ Готівка</ToggleGroupItem>
        </ToggleGroup>

        {!days.length && <p className="py-2 text-sm text-muted-foreground">{state.expenses.length ? 'Нічого не знайдено.' : 'Поки немає записів. Записуйте кожну витрату — саме так видно, куди йдуть гроші.'}</p>}
        {days.map(([day, list]) => (
          <div key={day}>
            <div className="flex items-baseline justify-between border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{day}</span><span className="tabular-nums">{fmt(list.reduce((s, x) => s + num(x.amount), 0))}</span>
            </div>
            {list.map((x) => {
              const env = state.envelopes.find((e) => e.id === x.env)
              return (
                <div key={x.id} className="flex items-center gap-3 py-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-base">{env ? envEmoji(env) : '❔'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{x.note || env?.name || 'Витрата'}</div>
                    <Select value={x.env} onValueChange={(v) => void b.moveExpense(x.id, v)}>
                      <SelectTrigger size="sm" className="h-6 border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none dark:bg-transparent" aria-label="Стаття">
                        <SelectValue placeholder="Видалена стаття" />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUPS.map((g) => {
                          const envs = state.envelopes.filter((e) => e.group === g.id)
                          return envs.length ? (
                            <SelectGroup key={g.id}>
                              <SelectLabel>{g.name}</SelectLabel>
                              {envs.map((e) => <SelectItem key={e.id} value={e.id}>{envEmoji(e)} {e.name}</SelectItem>)}
                            </SelectGroup>
                          ) : null
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-right">
                    <div className="whitespace-nowrap font-semibold tabular-nums">−{fmt(x.amount)}</div>
                    <div className="text-xs text-muted-foreground">{x.source === 'mono' ? '💳' : x.source === 'receipt' ? '🧾' : '✍️'} {x.who}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Видалити запис" onClick={() => void b.deleteExpense(x.id)}>
                    <X className="size-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
