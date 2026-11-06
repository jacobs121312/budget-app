import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Budget } from '@/hooks/use-budget'
import { GROUPS, fmt, goalProgress, monthKey, monthLabel, num, spentBy } from '@/lib/budget'
import { cn } from '@/lib/utils'
import { Columns, groupAccent, groupBar } from './layout'
import { goalText } from './plan-view'

export function TrackView({ b }: { b: Budget }) {
  const { state, c } = b
  const spent = spentBy(state)
  const now = new Date()
  const isCurrent = state.month === monthKey(now)
  const isPast = state.month < monthKey(now)

  let spendPlan = 0, spendTotal = 0, dailyLeft = 0
  for (const e of state.envelopes) {
    if (e.group === 'goals') continue
    spendPlan += c.plan[e.id] || 0
    spendTotal += spent[e.id] || 0
    if (e.group === 'daily') dailyLeft += Math.max(0, (c.plan[e.id] || 0) - (spent[e.id] || 0))
  }
  const [y, m] = state.month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const daysLeft = isCurrent ? daysInMonth - now.getDate() + 1 : isPast ? 0 : daysInMonth
  const left = spendPlan - spendTotal

  const closeMonth = () => {
    if (window.confirm(`Закрити ${monthLabel(state.month)}? Підсумок збережеться в історії, а список витрат очиститься.`)) void b.closeMonth()
  }

  const side = (
    <>
      {isPast && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertDescription className="space-y-2">
            <p>{monthLabel(state.month)} вже минув. Закрийте його, щоб зберегти підсумок в історії.</p>
            <Button size="sm" onClick={closeMonth}>Закрити {monthLabel(state.month)}</Button>
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm capitalize text-muted-foreground">{monthLabel(state.month)}</div>
            <div className={cn('text-4xl font-bold tracking-tight tabular-nums', left < 0 && 'text-destructive')}>{fmt(left)}</div>
            <div className="text-sm text-muted-foreground">{left < 0 ? 'перевитрата відносно плану' : 'лишилось на витрати з плану (без накопичень)'}</div>
          </div>
          <Progress value={Math.min(100, spendPlan ? (spendTotal / spendPlan) * 100 : 0)} className={cn('h-2', spendTotal > spendPlan && '[&>[data-slot=progress-indicator]]:bg-destructive')} />
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Витрачено', fmt(spendTotal)],
              ['Заплановано', fmt(spendPlan)],
              ['Щоденні: на день', daysLeft ? fmt(dailyLeft / daysLeft) : '—'],
              ['Днів до кінця', String(daysLeft)],
            ].map(([t, v]) => (
              <div key={t} className="rounded-lg bg-muted px-3 py-2">
                <div className="text-xs text-muted-foreground">{t}</div>
                <div className="font-semibold tabular-nums">{v}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <AddExpense b={b} />
    </>
  )

  const main = (
    <div className="space-y-4">
      <div className="space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {GROUPS.map((g) => {
          const envs = state.envelopes.filter((e) => e.group === g.id)
          if (!envs.length) return null
          const gs = envs.reduce((s, e) => s + (spent[e.id] || 0), 0)
          return (
            <Card key={g.id}>
              <CardHeader>
                <CardTitle className={groupAccent[g.id]}>{g.name}</CardTitle>
                <CardAction className={cn('text-sm font-semibold tabular-nums', groupAccent[g.id])}>{fmt(gs)} / {fmt(c.groups[g.id] || 0)}</CardAction>
              </CardHeader>
              <CardContent className="divide-y">
                {envs.map((e) => {
                  const p = c.plan[e.id] || 0, s = spent[e.id] || 0, l = p - s
                  const isGoal = g.id === 'goals'
                  const gp = isGoal ? goalProgress(state, e, c, spent) : null
                  const canPay = (g.id === 'fixed' || g.id === 'debts' || isGoal) && p > 0
                  const paid = s >= p - 0.5
                  let due: React.ReactNode = null
                  if (e.debt && canPay && !paid) {
                    if (!e.debt.day) due = <div className="text-xs font-semibold text-amber-600">Вкажіть день платежу на вкладці «План»</div>
                    else {
                      const day = Math.min(num(e.debt.day), daysInMonth)
                      const diff = isCurrent ? day - now.getDate() : isPast ? -1 : 99
                      due = <div className={cn('text-xs', diff < 0 ? 'font-semibold text-destructive' : diff <= 3 ? 'font-semibold text-amber-600' : 'text-muted-foreground')}>
                        {diff < 0 ? `Платіж ${day} числа — перевірте, чи сплачено` : diff === 0 ? 'Платіж сьогодні!' : diff <= 3 ? `Платіж ${day} числа — через ${diff} дн.` : `Платіж ${day} числа`}
                      </div>
                    }
                  }
                  return (
                    <div key={e.id} className="space-y-1.5 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-medium">{e.name || 'Без назви'}</span>
                        <span className={cn('whitespace-nowrap font-semibold tabular-nums', !isGoal && l < 0 && 'text-destructive')}>
                          {isGoal ? `${fmt(s)} з ${fmt(p)}` : l < 0 ? `перевитрата ${fmt(-l)}` : fmt(l)}
                        </span>
                      </div>
                      <Progress value={Math.min(100, p ? (s / p) * 100 : s ? 100 : 0)} className={cn(groupBar[g.id], !isGoal && s > p && '[&>[data-slot=progress-indicator]]:bg-destructive')} />
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">
                          {e.debt ? `борг після оплати: ${fmt(Math.max(0, num(e.debt.left) - s))}` : isGoal ? (gp?.hasTarget ? goalText(gp) : `відкладено ${fmt(s)}`) : `витрачено ${fmt(s)} з ${fmt(p)}`}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          {canPay && (paid
                            ? <span className="font-semibold text-emerald-600">✓ {isGoal ? 'відкладено' : 'сплачено'}</span>
                            : <button className="font-semibold text-primary" onClick={() => void b.addExpense(e.id, p - s, isGoal ? 'відкладено' : 'оплата')}>{isGoal ? `Відкласти ${fmt(p - s)}` : 'Сплачено'}</button>)}
                          {e.jar && <a className="flex items-center gap-0.5 font-semibold text-primary" href={e.jar} target="_blank" rel="noopener noreferrer">Банка <ExternalLink className="size-3" /></a>}
                        </span>
                      </div>
                      {due}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Усі витрати місяця</CardTitle>
          <CardAction className="text-sm text-muted-foreground">{state.expenses.length || ''}</CardAction>
        </CardHeader>
        <CardContent className="divide-y">
          {!state.expenses.length && <p className="py-2 text-sm text-muted-foreground">Поки немає записів. Записуйте кожну витрату — саме так видно, куди йдуть гроші.</p>}
          {[...state.expenses].sort((a, x) => (a.date < x.date ? 1 : -1)).map((x) => {
            const env = state.envelopes.find((e) => e.id === x.env)
            return (
              <div key={x.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{env ? env.name || 'Без назви' : 'Видалена стаття'}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {x.source === 'mono' ? '💳 ' : x.source === 'receipt' ? '🧾 ' : ''}
                    {new Date(x.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}{x.who ? ` · ${x.who}` : ''}{x.note ? ` · ${x.note}` : ''}
                  </div>
                </div>
                <span className="whitespace-nowrap font-semibold tabular-nums">{fmt(x.amount)}</span>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Видалити запис" onClick={() => void b.deleteExpense(x.id)}>
                  <X className="size-4" />
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Попередні місяці</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!state.history.length && <p className="text-sm text-muted-foreground">Тут з’являться підсумки закритих місяців: план, факт і де була перевитрата.</p>}
          {[...state.history].reverse().map((h) => (
            <div key={h.month} className="border-b pb-2 last:border-b-0">
              <div className="flex justify-between text-sm font-semibold"><span>{monthLabel(h.month)}</span><span className="tabular-nums">{fmt(h.spent)} / {fmt(h.plan)}</span></div>
              <div className="text-xs text-muted-foreground">Дохід {fmt(h.income)} · відкладено {fmt(h.saved)} · {h.over.length ? 'перевитрати: ' + h.over.map((o) => `${o.name} +${fmt(o.amount)}`).join(', ') : 'без перевитрат'}</div>
            </div>
          ))}
          <Button variant="secondary" className="w-full" onClick={closeMonth}>Закрити місяць і почати новий</Button>
        </CardContent>
      </Card>
    </div>
  )

  return <Columns side={side} main={main} stickySide />
}

function AddExpense({ b }: { b: Budget }) {
  const { state } = b
  const daily = state.envelopes.find((e) => e.group === 'daily')
  const [env, setEnv] = useState(daily?.id || state.envelopes[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [who, setWho] = useState(state.people[0] || 'Я')
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const a = num(amount)
    if (!env || a <= 0) return
    if (await b.addExpense(env, a, note.trim(), who)) { setAmount(''); setNote('') }
  }
  return (
    <Card>
      <CardHeader><CardTitle>Записати витрату</CardTitle><CardDescription>Готівка або те, чого немає в monobank.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-[1fr_7rem] gap-2">
          <Select value={env} onValueChange={setEnv}>
            <SelectTrigger className="w-full" aria-label="Стаття"><SelectValue placeholder="Стаття" /></SelectTrigger>
            <SelectContent>
              {GROUPS.map((g) => {
                const envs = state.envelopes.filter((e) => e.group === g.id)
                return envs.length ? (
                  <SelectGroup key={g.id}>
                    <SelectLabel>{g.name}</SelectLabel>
                    {envs.map((e) => <SelectItem key={e.id} value={e.id}>{e.name || 'Без назви'}</SelectItem>)}
                  </SelectGroup>
                ) : null
              })}
            </SelectContent>
          </Select>
          <Input type="number" inputMode="decimal" min={0} step="0.01" placeholder="Сума" aria-label="Сума" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-right font-semibold tabular-nums" />
          <Input className="col-span-2" placeholder="Коментар (необов'язково)" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
          <Select value={who} onValueChange={setWho}>
            <SelectTrigger className="w-full" aria-label="Хто витратив"><SelectValue /></SelectTrigger>
            <SelectContent>{state.people.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit">Додати</Button>
        </form>
      </CardContent>
    </Card>
  )
}
