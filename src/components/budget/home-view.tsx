import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Info, ListChecks, PiggyBank, Plus, Sparkles, XCircle } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import type { Budget } from '@/hooks/use-budget'
import {
  bills, dailySpend, envEmoji, fmt, goalProgress, insights, monthKey, monthLabel, num, paceSeries, payoffOf, spendingByPerson, spentBy, untilMonth,
} from '@/lib/budget'
import type { Envelope } from '@/lib/types'
import { cn } from '@/lib/utils'
import { goalText } from './plan-view'

const paceConfig = {
  actual: { label: 'Витрачено', color: 'var(--chart-1)' },
  pace: { label: 'Рівний темп', color: 'var(--chart-4)' },
} satisfies ChartConfig

const weekConfig = { v: { label: 'Витрачено', color: 'var(--chart-3)' } } satisfies ChartConfig

const historyConfig = {
  plan: { label: 'План', color: 'var(--chart-3)' },
  spent: { label: 'Витрачено', color: 'var(--chart-1)' },
  saved: { label: 'Відкладено', color: 'var(--chart-5)' },
} satisfies ChartConfig

const short = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)))
const WD = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const flexible = (e: Envelope) => e.group === 'daily' || e.group === 'personal'

export function HomeView({ b, onAdd }: { b: Budget; onAdd: () => void }) {
  const { state, c } = b
  const spent = spentBy(state)
  const pace = paceSeries(state, c)
  const list = bills(state, c)
  const tips = insights(state, c)
  const people = spendingByPerson(state)
  const peopleTotal = Object.values(people).reduce((s, v) => s + v, 0)
  const now = new Date()
  const isCurrent = state.month === monthKey(now)
  const [y, m] = state.month.split('-').map(Number)
  const dim = new Date(y, m, 0).getDate()
  const today = isCurrent ? now.getDate() : dim

  let spendPlan = 0, spendTotal = 0, savedNow = 0
  for (const e of state.envelopes) {
    if (e.group === 'goals') { savedNow += spent[e.id] || 0; continue }
    spendPlan += c.plan[e.id] || 0
    spendTotal += spent[e.id] || 0
  }
  const debtLeft = state.envelopes.filter((e) => e.debt).reduce((s, e) => s + Math.max(0, num(e.debt!.left)), 0)
  const lastDebt = state.envelopes.filter((e) => e.debt).map((e) => payoffOf(state, e, c).last).filter(Boolean).sort().pop()
  const ahead = pace.spentPaced - pace.expectedNow
  const perDay = pace.daysLeft ? Math.max(0, pace.freeToSpend) / pace.daysLeft : 0

  // The three biggest flexible envelopes as "account" cards with a small trend line.
  const top = state.envelopes.filter((e) => flexible(e) && (c.plan[e.id] || 0) > 0).sort((a, b2) => (c.plan[b2.id] || 0) - (c.plan[a.id] || 0)).slice(0, 3)

  // Last 7 days of flexible spending; today's bar is highlighted.
  const flexDays = dailySpend(state, flexible)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = today - 6 + i
    const date = new Date(y, m - 1, d)
    return { d, label: d >= 1 ? WD[date.getDay()] : '', v: d >= 1 ? Math.round(flexDays[d] || 0) : 0, today: d === today && isCurrent }
  })
  const weekTotal = week.reduce((s, x) => s + x.v, 0)

  // Month calendar: how much went out each day (everything but savings).
  const allDays = dailySpend(state)
  const maxDay = Math.max(1, ...allDays.slice(1, today + 1))
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7

  const elapsedShare = pace.daysLeft ? (dim - pace.daysLeft + 1) / dim : 1
  const trending = state.envelopes
    .filter((e) => flexible(e) && (c.plan[e.id] || 0) > 0)
    .map((e) => ({ e, p: c.plan[e.id] || 0, s: spent[e.id] || 0 }))
    .map((x) => ({ ...x, used: x.s / x.p, vsPace: x.s / x.p - elapsedShare }))
    .sort((a, b2) => b2.vsPace - a.vsPace)
    .slice(0, 6)

  const recent = [...state.expenses].sort((a, b2) => (a.date < b2.date ? 1 : -1)).slice(0, 6)
  const history = state.history.slice(-6).map((h) => ({ month: monthLabel(h.month).split(' ')[0].slice(0, 3), spent: h.spent, plan: h.plan, saved: h.saved }))
  const stats = [
    { t: 'Витрачено', v: fmt(spendTotal), s: `з ${fmt(spendPlan)}`, p: spendPlan ? (spendTotal / spendPlan) * 100 : 0 },
    { t: 'Відкладено', v: fmt(savedNow), s: `план ${fmt(c.groups.goals || 0)}`, p: c.groups.goals ? (savedNow / c.groups.goals) * 100 : 0, bar: '[&>[data-slot=progress-indicator]]:bg-[var(--chart-5)]' },
    { t: 'Борги', v: fmt(debtLeft), s: lastDebt ? `до ${monthLabel(lastDebt).toLowerCase()}` : 'боргів немає' },
    { t: 'Нерозподілено', v: fmt(c.unallocated), s: Math.round(c.unallocated) === 0 ? 'кожна гривня при ділі' : 'розподіліть на «Плані»', tone: Math.round(c.unallocated) === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary' },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
      {/* Hero: what is free to spend, actions, key numbers. */}
      <section className="grid gap-4 lg:col-span-12 lg:grid-cols-12 lg:gap-5">
        <div className="flex flex-col justify-between gap-5 py-1 lg:col-span-6">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Вільно до кінця місяця</div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('num text-[2.75rem] font-semibold leading-none sm:text-5xl', pace.freeToSpend < 0 && 'text-destructive')}>{fmt(pace.freeToSpend)}</span>
              <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium num',
                ahead > 0 ? 'bg-destructive/12 text-destructive' : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400')}>
                {ahead > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {ahead > 0 ? `${fmt(ahead)} понад темп` : `${fmt(-ahead)} в запасі`}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {pace.daysLeft ? <span>≈ <b className="num font-semibold text-foreground">{fmt(perDay)}</b> на день</span> : null}
              <span>{pace.daysLeft ? `${pace.daysLeft} дн. до кінця ${untilMonth(state.month)}` : monthLabel(state.month)}</span>
              <span>дохід <b className="num font-medium text-foreground">{fmt(c.income)}</b></span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-full" onClick={onAdd}><Plus /> Витрата</Button>
            <Button variant="outline" className="rounded-full bg-card" onClick={() => b.setTab('plan')}><ListChecks /> Розподілити</Button>
            <Button variant="outline" className="rounded-full bg-card" onClick={() => b.setTab('jars')}><PiggyBank /> Банки</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-6 lg:gap-4">
          {stats.map((k) => (
            <Card key={k.t} className="gap-1.5 py-4 sm:py-4">
              <CardContent className="space-y-1 px-4 sm:px-4">
                <div className="text-xs text-muted-foreground">{k.t}</div>
                <div className={cn('num text-xl font-semibold', k.tone)}>{k.v}</div>
                <div className="truncate text-xs text-muted-foreground">{k.s}</div>
                {k.p !== undefined && <Progress value={Math.min(100, k.p)} className={cn('mt-1.5 h-1', k.bar)} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Envelope cards (like currency cards), plus a shortcut to the plan. */}
      <section className="fade-x -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:fade-x-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:col-span-12 lg:grid-cols-4 lg:gap-5">
        {top.map((e) => {
          const p = c.plan[e.id] || 0, s = spent[e.id] || 0
          const days = dailySpend(state, (x) => x.id === e.id)
          let sum = 0
          const line = days.slice(1, today + 1).map((v, i) => ({ i, v: (sum += v) }))
          const over = s > p * (today / dim) + 1
          return (
            <Card key={e.id} className="min-w-[78%] snap-start gap-3 py-4 sm:min-w-0">
              <CardContent className="space-y-3 px-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-sm" aria-hidden>{envEmoji(e)}</span>
                  <span className="truncate font-medium">{e.name}</span>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className={cn('num text-2xl font-semibold', s > p && 'text-destructive')}>{fmt(p - s)}</div>
                    <div className="text-xs text-muted-foreground">лишилось з {fmt(p)}</div>
                  </div>
                  <ChartContainer config={{ v: { label: 'Витрачено', color: over ? 'var(--chart-1)' : 'var(--chart-5)' } }} className="aspect-auto h-10 w-24">
                    <AreaChart data={line} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id={`sp-${e.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-v)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-v)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area dataKey="v" type="monotone" stroke="var(--color-v)" strokeWidth={1.75} fill={`url(#sp-${e.id})`} isAnimationActive={false} />
                    </AreaChart>
                  </ChartContainer>
                </div>
                <Progress value={Math.min(100, p ? (s / p) * 100 : 0)} className={cn('h-1', over ? '[&>[data-slot=progress-indicator]]:bg-primary' : '[&>[data-slot=progress-indicator]]:bg-[var(--chart-5)]')} />
              </CardContent>
            </Card>
          )
        })}
        <button onClick={() => b.setTab('track')}
          className="flex min-w-[60%] snap-start flex-col items-start justify-between gap-3 rounded-2xl border border-dashed p-4 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:min-w-0">
          <span className="flex size-7 items-center justify-center rounded-lg border border-dashed"><ArrowRight className="size-4" /></span>
          <span>Усі статті, перевитрати й перекриття — на вкладці <b className="font-medium text-foreground">«Витрати»</b></span>
        </button>
      </section>

      {/* Pace of the month */}
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardDescription>Щоденне й особисте за місяць</CardDescription>
          <CardTitle className="num text-2xl font-semibold">{fmt(pace.spentPaced)} <span className="whitespace-nowrap text-base font-normal text-muted-foreground">з {fmt(pace.planPaced)}</span></CardTitle>
          <CardAction className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-primary" />факт</span>
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-[var(--chart-4)]" />рівний темп</span>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ChartContainer config={paceConfig} className="aspect-auto h-44 w-full sm:h-56">
            <AreaChart data={pace.series} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-actual)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-actual)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="2 4" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} interval={4} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={38} tickFormatter={short} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `${p?.[0]?.payload?.day} число`} formatter={(v, name) => (
                <div className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{paceConfig[name as keyof typeof paceConfig]?.label}</span><span className="font-mono tabular-nums">{fmt(Number(v))}</span></div>
              )} />} />
              <Line dataKey="pace" type="linear" stroke="var(--color-pace)" strokeDasharray="4 4" strokeWidth={1.25} dot={false} />
              <Area dataKey="actual" type="monotone" stroke="var(--color-actual)" strokeWidth={2.25} fill="url(#fillActual)" connectNulls={false}
                activeDot={{ r: 5, fill: 'var(--color-actual)', stroke: 'var(--card)', strokeWidth: 3 }} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Last 7 days */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardDescription>Останні 7 днів</CardDescription>
          <CardTitle className="num text-2xl font-semibold">{fmt(weekTotal)}</CardTitle>
          <CardAction className="text-xs text-muted-foreground">≈ {fmt(weekTotal / 7)}/день</CardAction>
        </CardHeader>
        <CardContent>
          <ChartContainer config={weekConfig} className="aspect-auto h-56 w-full">
            <BarChart data={week} margin={{ top: 8, left: 0, right: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator labelFormatter={(_, p) => `${p?.[0]?.payload?.d} число`} formatter={(v) => <span className="font-mono tabular-nums">{fmt(Number(v))}</span>} />} />
              <Bar dataKey="v" radius={8} background={{ fill: 'var(--muted)', radius: 8 }}>
                {week.map((x) => <Cell key={x.d} fill={x.today ? 'var(--chart-1)' : 'var(--chart-4)'} fillOpacity={x.today ? 1 : 0.55} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Останні витрати</CardTitle>
          <CardAction><Button variant="ghost" size="sm" className="h-7 rounded-full text-xs" onClick={() => b.setTab('track')}>Усі <ArrowRight /></Button></CardAction>
        </CardHeader>
        <CardContent className="space-y-1">
          {!recent.length && <p className="text-sm text-muted-foreground">Ще немає витрат цього місяця.</p>}
          {recent.map((x) => {
            const env = state.envelopes.find((e) => e.id === x.env)
            const d = new Date(x.date)
            return (
              <div key={x.id} className="flex items-center gap-3 rounded-xl py-1.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-base" aria-hidden>{env ? envEmoji(env) : '•'}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{x.note || x.merchant || env?.name || 'Витрата'}</div>
                  <div className="truncate text-xs text-muted-foreground">{env?.name} · {x.who} · {d.getDate()} {WD[d.getDay()].toLowerCase()}</div>
                </div>
                <span className="num whitespace-nowrap text-sm font-semibold">−{fmt(num(x.amount))}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Bills: paid / left to pay */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Платежі місяця</CardTitle>
          <CardDescription>
            {list.length ? `сплачено ${fmt(list.reduce((s, x) => s + Math.min(x.paid, x.amount), 0))} · лишилось ${fmt(list.reduce((s, x) => s + x.left, 0))}` : 'Вкажіть «день оплати» в статтях, щоб бачити календар.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {list.map((x) => (
            <div key={x.env.id} className="flex items-center gap-3 py-1.5">
              <div className={cn('num flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold',
                x.left <= 0.5 ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : x.inDays < 0 ? 'bg-destructive/12 text-destructive' : x.inDays <= 3 ? 'bg-primary/12 text-primary' : 'bg-muted')}>
                {x.day}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{envEmoji(x.env)} {x.env.name}</div>
                <div className="text-xs text-muted-foreground">{x.left <= 0.5 ? '✓ сплачено' : x.inDays < 0 ? 'дата минула' : x.inDays === 0 ? 'сьогодні' : `через ${x.inDays} дн.`}</div>
              </div>
              <span className={cn('num whitespace-nowrap text-sm font-semibold', x.left <= 0.5 && 'text-muted-foreground line-through')}>{fmt(x.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Month calendar heatmap */}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Календар витрат</CardTitle>
          <CardDescription>Що темніше — то більше витрачено того дня</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((d) => <div key={d}>{d}</div>)}
            {Array.from({ length: lead }, (_, i) => <div key={`l${i}`} />)}
            {Array.from({ length: dim }, (_, i) => {
              const d = i + 1, v = allDays[d] || 0, future = d > today
              const k = v ? 18 + Math.round((v / maxDay) * 82) : 0
              return (
                <div key={d} title={future ? `${d} число` : `${d} число: ${fmt(v)}`}
                  className={cn('num flex aspect-square items-center justify-center rounded-md text-[10px] font-medium',
                    future ? 'border border-dashed text-muted-foreground/50' : v ? (k > 60 ? 'text-primary-foreground' : 'text-foreground') : 'bg-muted text-muted-foreground',
                    d === today && isCurrent && 'ring-2 ring-foreground/70 ring-offset-1 ring-offset-card')}
                  style={!future && v ? { background: `color-mix(in srgb, var(--primary) ${k}%, var(--muted))` } : undefined}>
                  {d}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
            менше {[0, 30, 55, 80, 100].map((k) => <span key={k} className="size-2.5 rounded-sm" style={{ background: k ? `color-mix(in srgb, var(--primary) ${k}%, var(--muted))` : 'var(--muted)' }} />)} більше
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="lg:col-span-5">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Підказки</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!tips.length && <p className="text-sm text-muted-foreground">Усе йде за планом — нічого термінового.</p>}
          {tips.map((t, i) => {
            const Icon = t.tone === 'good' ? CheckCircle2 : t.tone === 'bad' ? XCircle : t.tone === 'warn' ? AlertTriangle : Info
            return (
              <div key={i} className="flex gap-3 rounded-xl bg-muted/60 p-3 text-sm">
                <Icon className={cn('mt-0.5 size-4 shrink-0', t.tone === 'good' ? 'text-emerald-600' : t.tone === 'bad' ? 'text-destructive' : t.tone === 'warn' ? 'text-primary' : 'text-blue-500')} />
                <span>{t.text}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Trending categories */}
      <Card className="lg:col-span-7">
        <CardHeader><CardTitle>Темп статей</CardTitle><CardDescription>Витрачено проти того, скільки місяця минуло ({Math.round(elapsedShare * 100)}%)</CardDescription></CardHeader>
        <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {trending.map((x) => (
            <div key={x.e.id} className="space-y-1.5">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">{envEmoji(x.e)} {x.e.name}</span>
                <span className={cn('num whitespace-nowrap', x.used > 1 ? 'font-semibold text-destructive' : x.vsPace > 0.1 ? 'font-semibold text-primary' : 'text-muted-foreground')}>{fmt(x.s)} / {fmt(x.p)}</span>
              </div>
              <div className="relative">
                <Progress value={Math.min(100, x.used * 100)} className={cn('h-1.5', x.used > 1 ? '[&>[data-slot=progress-indicator]]:bg-destructive' : x.vsPace > 0.1 ? '[&>[data-slot=progress-indicator]]:bg-primary' : '[&>[data-slot=progress-indicator]]:bg-[var(--chart-5)]')} />
                <span className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-foreground/60" style={{ left: `${Math.min(100, elapsedShare * 100)}%` }} title="сьогодні" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="lg:col-span-7">
        <CardHeader><CardTitle>Цілі</CardTitle><CardDescription>Подушка, відпустка й інші накопичення</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {state.envelopes.filter((e) => e.group === 'goals').map((e) => {
            const g = goalProgress(state, e, c, spent)
            const pct = g.hasTarget ? Math.min(100, (g.saved / g.amount!) * 100) : 0
            return (
              <div key={e.id} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg" aria-hidden>{envEmoji(e)}</span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex justify-between gap-2 text-sm"><span className="truncate font-medium">{e.name}</span><span className="num font-semibold">{g.hasTarget ? `${Math.round(pct)}%` : fmt(g.saved)}</span></div>
                  {g.hasTarget && <Progress value={pct} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-[var(--chart-5)]" />}
                  <div className={cn('text-xs', g.hasTarget && !g.onTrack ? 'text-primary' : 'text-muted-foreground')}>{goalText(g) || `${fmt(g.plan)}/міс · ціль не задано — задайте на «Плані»`}</div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Who spends */}
      <Card className="lg:col-span-5">
        <CardHeader><CardTitle>Хто витрачає</CardTitle><CardDescription>Цього місяця, без накопичень</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {!peopleTotal && <p className="text-sm text-muted-foreground">Ще немає витрат.</p>}
          {peopleTotal > 0 && (
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {Object.entries(people).sort((a, b2) => b2[1] - a[1]).map(([who, v], i) => (
                <div key={who} style={{ width: `${(v / peopleTotal) * 100}%`, background: i === 0 ? 'var(--chart-1)' : i === 1 ? 'var(--chart-4)' : 'var(--chart-3)' }} />
              ))}
            </div>
          )}
          {Object.entries(people).sort((a, b2) => b2[1] - a[1]).map(([who, v], i) => (
            <div key={who} className="flex items-center gap-2 text-sm">
              <span className="size-2.5 rounded-full" style={{ background: i === 0 ? 'var(--chart-1)' : i === 1 ? 'var(--chart-4)' : 'var(--chart-3)' }} />
              <span className="flex-1 font-medium">{who}</span>
              <span className="num">{fmt(v)}</span>
              <span className="num w-10 text-right text-muted-foreground">{Math.round((v / peopleTotal) * 100)}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card className="lg:col-span-12">
          <CardHeader><CardTitle>Останні місяці</CardTitle><CardDescription>Витрачено проти плану і скільки відкладено</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={historyConfig} className="aspect-auto h-56 w-full">
              <BarChart data={history}>
                <CartesianGrid vertical={false} strokeDasharray="2 4" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={38} tickFormatter={short} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="plan" fill="var(--color-plan)" radius={6} />
                <Bar dataKey="spent" fill="var(--color-spent)" radius={6} />
                <Bar dataKey="saved" fill="var(--color-saved)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
