import { useState } from 'react'
import { ExternalLink, Plus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Budget } from '@/hooks/use-budget'
import { GROUPS, envEmoji, fmt, goalProgress, monthKey, monthLabel, num, spentBy } from '@/lib/budget'
import type { Envelope } from '@/lib/types'
import { reveal } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { CoverDialog } from './cover-dialog'
import { ExpenseList } from './expense-list'
import { Columns, groupBar, groupFill } from './layout'
import { goalText } from './plan-view'

export function TrackView({ b, onAdd }: { b: Budget; onAdd: () => void }) {
  const { state, c } = b
  const [covering, setCovering] = useState<Envelope | null>(null)
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

  const go = reveal

  const overview = (
    <Card className="mb-4 lg:mb-5">
      <CardContent className="space-y-5">
        {isPast && (
          <Alert className="border-primary/30 bg-primary/[0.06]">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{monthLabel(state.month)} вже минув. Закрийте його, щоб зберегти підсумок в історії.</span>
              <Button size="sm" className="rounded-full" onClick={closeMonth}>Закрити {monthLabel(state.month)}</Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{monthLabel(state.month)} · лишилось з плану</div>
            <div className={cn('num text-4xl font-semibold', left < 0 && 'text-destructive')}>{fmt(left)}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {[
              ['Витрачено', fmt(spendTotal)],
              ['Заплановано', fmt(spendPlan)],
              ['Щоденні на день', daysLeft ? fmt(dailyLeft / daysLeft) : '—'],
              ['Днів до кінця', String(daysLeft)],
            ].map(([t, v]) => (
              <div key={t}>
                <div className="text-xs text-muted-foreground">{t}</div>
                <div className="num font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <Progress value={Math.min(100, spendPlan ? (spendTotal / spendPlan) * 100 : 0)} className={cn('h-2', spendTotal > spendPlan && '[&>[data-slot=progress-indicator]]:bg-destructive')} />
        <div className="fade-x -mx-4 flex gap-2 overflow-x-auto px-4 pr-10 [scrollbar-width:none] sm:fade-x-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {GROUPS.map((g) => {
            const gs = state.envelopes.filter((e) => e.group === g.id).reduce((sum, e) => sum + (spent[e.id] || 0), 0)
            const gp = c.groups[g.id] || 0
            return (
              <button key={g.id} onClick={() => go(`track-${g.id}`)}
                className="flex shrink-0 items-center gap-2 rounded-full border bg-background/50 py-1 pl-2.5 pr-3 text-xs transition-colors hover:border-primary/50">
                <span className="size-2 rounded-full" style={{ background: groupFill[g.id] }} />
                <span className="font-medium">{g.name}</span>
                <span className={cn('num', gs > gp + 0.5 && g.id !== 'goals' ? 'text-destructive' : 'text-muted-foreground')}>{fmt(gs)} / {fmt(gp)}</span>
              </button>
            )
          })}
          <Button size="sm" className="h-7 shrink-0 rounded-full" onClick={onAdd}><Plus /> Витрата</Button>
        </div>
      </CardContent>
    </Card>
  )

  const main = (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const envs = state.envelopes.filter((e) => e.group === g.id)
        if (!envs.length) return null
        const gs = envs.reduce((sum, e) => sum + (spent[e.id] || 0), 0)
        const gp = c.groups[g.id] || 0
        return (
          <Card key={g.id} id={`track-${g.id}`} className="scroll-mt-24 gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5"><span className="h-5 w-1.5 rounded-full" style={{ background: groupFill[g.id] }} />{g.name}</CardTitle>
              <CardAction className="num text-sm font-semibold">{fmt(gs)} <span className="font-normal text-muted-foreground">/ {fmt(gp)}</span></CardAction>
            </CardHeader>
            <CardContent className="divide-y">
              {envs.map((e) => {
                const p = c.plan[e.id] || 0, sp = spent[e.id] || 0, l = p - sp
                const isGoal = g.id === 'goals'
                const gp2 = isGoal ? goalProgress(state, e, c, spent) : null
                const canPay = (g.id === 'fixed' || g.id === 'debts' || isGoal) && p > 0
                const paid = sp >= p - 0.5
                let due: React.ReactNode = null
                if (e.debt && canPay && !paid) {
                  if (!e.debt.day) due = <span className="font-semibold text-primary">вкажіть день платежу на «Плані»</span>
                  else {
                    const day = Math.min(num(e.debt.day), daysInMonth)
                    const diff = isCurrent ? day - now.getDate() : isPast ? -1 : 99
                    due = <span className={cn(diff < 0 ? 'font-semibold text-destructive' : diff <= 3 ? 'font-semibold text-primary' : '')}>
                      {diff < 0 ? `платіж ${day} числа — перевірте, чи сплачено` : diff === 0 ? 'платіж сьогодні!' : diff <= 3 ? `платіж ${day} числа — через ${diff} дн.` : `платіж ${day} числа`}
                    </span>
                  }
                }
                return (
                  <div key={e.id} id={`track-env-${e.id}`} className="flex scroll-mt-28 items-center gap-3 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-base" aria-hidden>{envEmoji(e)}</span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{e.name || 'Без назви'}</span>
                        <span className={cn('num whitespace-nowrap text-sm font-semibold', !isGoal && l < 0 && 'text-destructive')}>
                          {isGoal ? `${fmt(sp)} з ${fmt(p)}` : l < 0 ? `−${fmt(-l)}` : fmt(l)}
                        </span>
                      </div>
                      <Progress value={Math.min(100, p ? (sp / p) * 100 : sp ? 100 : 0)} className={cn('h-1.5', groupBar[g.id], !isGoal && sp > p && '[&>[data-slot=progress-indicator]]:bg-destructive')} />
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="min-w-0 truncate">
                          {e.debt ? <>борг після оплати {fmt(Math.max(0, num(e.debt.left) - sp))}{due && <> · {due}</>}</> : isGoal ? (gp2?.hasTarget ? goalText(gp2) : `відкладено ${fmt(sp)}`) : l < 0 ? `перевитрата · витрачено ${fmt(sp)} з ${fmt(p)}` : `витрачено ${fmt(sp)} з ${fmt(p)}`}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          {canPay && (paid
                            ? <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ {isGoal ? 'відкладено' : 'сплачено'}</span>
                            : <button className="font-semibold text-primary" onClick={() => void b.addExpense(e.id, p - sp, isGoal ? 'відкладено' : 'оплата')}>{isGoal ? `Відкласти ${fmt(p - sp)}` : 'Позначити сплаченим'}</button>)}
                          {!isGoal && (g.id === 'daily' || g.id === 'personal') && l < -0.5 && <button className="font-semibold text-destructive" onClick={() => setCovering(e)}>Перекрити</button>}
                          {e.jar && <a className="flex items-center gap-0.5 font-medium hover:text-primary" href={e.jar} target="_blank" rel="noopener noreferrer">банка <ExternalLink className="size-3" /></a>}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  const side = (
    <>
      <div id="track-list" className="order-last scroll-mt-24 lg:order-none"><ExpenseList b={b} /></div>
      <Card id="track-history" className="order-last scroll-mt-24 lg:order-none">
        <CardHeader><CardTitle>Попередні місяці</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!state.history.length && <p className="text-sm text-muted-foreground">Тут з’являться підсумки закритих місяців: план, факт і де була перевитрата.</p>}
          {[...state.history].reverse().map((h) => (
            <div key={h.month} className="border-b pb-2 last:border-b-0">
              <div className="flex justify-between text-sm font-semibold"><span>{monthLabel(h.month)}</span><span className="num">{fmt(h.spent)} / {fmt(h.plan)}</span></div>
              <div className="text-xs text-muted-foreground">Дохід {fmt(h.income)} · відкладено {fmt(h.saved)} · {h.over.length ? 'перевитрати: ' + h.over.map((o) => `${o.name} +${fmt(o.amount)}`).join(', ') : 'без перевитрат'}</div>
            </div>
          ))}
          <Button variant="secondary" className="w-full rounded-xl" onClick={closeMonth}>Закрити місяць і почати новий</Button>
        </CardContent>
      </Card>
    </>
  )

  return (
    <>
      {overview}
      <Columns side={side} main={main} sideRight />
      <CoverDialog b={b} target={covering} onClose={() => setCovering(null)} />
    </>
  )
}
