import { AlertTriangle, CheckCircle2, Info, Sparkles, XCircle } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import type { Budget } from '@/hooks/use-budget'
import {
  bills, envEmoji, fmt, goalProgress, insights, monthLabel, num, paceSeries, payoffOf, spendingByPerson, spentBy, untilMonth,
} from '@/lib/budget'
import { cn } from '@/lib/utils'
import { goalText } from './plan-view'

const paceConfig = {
  actual: { label: 'Витрачено', color: 'var(--chart-2)' },
  pace: { label: 'Рівний темп', color: 'var(--muted-foreground)' },
} satisfies ChartConfig

const historyConfig = {
  spent: { label: 'Витрачено', color: 'var(--chart-2)' },
  plan: { label: 'План', color: 'var(--chart-4)' },
  saved: { label: 'Відкладено', color: 'var(--chart-1)' },
} satisfies ChartConfig

const short = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)))

export function HomeView({ b }: { b: Budget }) {
  const { state, c } = b
  const spent = spentBy(state)
  const pace = paceSeries(state, c)
  const list = bills(state, c)
  const tips = insights(state, c)
  const people = spendingByPerson(state)
  const peopleTotal = Object.values(people).reduce((s, v) => s + v, 0)

  let spendPlan = 0, spendTotal = 0, savedNow = 0
  for (const e of state.envelopes) {
    if (e.group === 'goals') { savedNow += spent[e.id] || 0; continue }
    spendPlan += c.plan[e.id] || 0
    spendTotal += spent[e.id] || 0
  }
  const debtLeft = state.envelopes.filter((e) => e.debt).reduce((s, e) => s + Math.max(0, num(e.debt!.left)), 0)
  const lastDebt = state.envelopes.filter((e) => e.debt).map((e) => payoffOf(state, e, c).last).filter(Boolean).sort().pop()
  const ahead = pace.spentPaced - pace.expectedNow

  // Categories moving fastest against the month (Copilot "trending categories").
  const elapsedShare = pace.daysLeft ? (pace.dim - pace.daysLeft + 1) / pace.dim : 1
  const trending = state.envelopes
    .filter((e) => (e.group === 'daily' || e.group === 'personal') && (c.plan[e.id] || 0) > 0)
    .map((e) => ({ e, p: c.plan[e.id] || 0, s: spent[e.id] || 0 }))
    .map((x) => ({ ...x, used: x.s / x.p, vsPace: x.s / x.p - elapsedShare }))
    .sort((a, b) => b.vsPace - a.vsPace)
    .slice(0, 5)

  const history = state.history.slice(-6).map((h) => ({ month: monthLabel(h.month).split(' ')[0].slice(0, 3), spent: h.spent, plan: h.plan, saved: h.saved }))

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* Free to spend + pace chart */}
      <Card className="lg:col-span-8">
        <CardHeader>
          <CardDescription>Вільно до кінця місяця · щоденне й особисте</CardDescription>
          <CardTitle className={cn('whitespace-nowrap text-3xl font-bold tracking-tight tabular-nums sm:text-4xl', pace.freeToSpend < 0 && 'text-destructive')}>{fmt(pace.freeToSpend)}</CardTitle>
          <CardAction>
            <Badge variant={ahead > 0 ? 'destructive' : 'secondary'} className="tabular-nums">
              {ahead > 0 ? `+${fmt(ahead)} понад темп` : `${fmt(-ahead)} в запасі`}
            </Badge>
          </CardAction>
          <p className="text-sm text-muted-foreground">
            {pace.daysLeft ? <>~<b className="text-foreground tabular-nums">{fmt(Math.max(0, pace.freeToSpend) / pace.daysLeft)}</b> на день · {pace.daysLeft} дн. до кінця {untilMonth(state.month)}</> : monthLabel(state.month)}
          </p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={paceConfig} className="aspect-auto h-48 w-full">
            <AreaChart data={pace.series} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} interval={4} tickMargin={6} />
              <YAxis tickLine={false} axisLine={false} width={38} tickFormatter={short} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `${p?.[0]?.payload?.day} число`} formatter={(v, name) => (
                <div className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{paceConfig[name as keyof typeof paceConfig]?.label}</span><span className="font-mono tabular-nums">{fmt(Number(v))}</span></div>
              )} />} />
              <Line dataKey="pace" type="linear" stroke="var(--color-pace)" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
              <Area dataKey="actual" type="monotone" stroke="var(--color-actual)" strokeWidth={2} fill="url(#fillActual)" connectNulls={false} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:col-span-4">
        {[
          { t: 'Витрачено', v: fmt(spendTotal), s: `з ${fmt(spendPlan)}`, p: spendPlan ? (spendTotal / spendPlan) * 100 : 0 },
          { t: 'Відкладено', v: fmt(savedNow), s: `план ${fmt(c.groups.goals || 0)}`, p: c.groups.goals ? (savedNow / c.groups.goals) * 100 : 0 },
          { t: 'Борги', v: fmt(debtLeft), s: lastDebt ? `без боргів з ${monthLabel(lastDebt).toLowerCase()}` : 'боргів немає' },
          { t: 'Нерозподілено', v: fmt(c.unallocated), s: Math.round(c.unallocated) === 0 ? 'кожна гривня при ділі' : 'розподіліть на «Плані»', tone: Math.round(c.unallocated) === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600' },
        ].map((k) => (
          <Card key={k.t} className="gap-2 py-4">
            <CardContent className="space-y-1 px-4">
              <div className="text-xs text-muted-foreground">{k.t}</div>
              <div className={cn('text-xl font-bold tabular-nums', k.tone)}>{k.v}</div>
              <div className="truncate text-xs text-muted-foreground">{k.s}</div>
              {k.p !== undefined && <Progress value={Math.min(100, k.p)} className="mt-1" />}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insights */}
      <Card className="lg:col-span-5">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Підказки</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!tips.length && <p className="text-sm text-muted-foreground">Усе йде за планом — нічого термінового.</p>}
          {tips.map((t, i) => {
            const Icon = t.tone === 'good' ? CheckCircle2 : t.tone === 'bad' ? XCircle : t.tone === 'warn' ? AlertTriangle : Info
            return (
              <div key={i} className="flex gap-2.5 text-sm">
                <Icon className={cn('mt-0.5 size-4 shrink-0', t.tone === 'good' ? 'text-emerald-600' : t.tone === 'bad' ? 'text-destructive' : t.tone === 'warn' ? 'text-amber-600' : 'text-blue-600')} />
                <span>{t.text}</span>
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
        <CardContent className="divide-y">
          {list.map((x) => (
            <div key={x.env.id} className="flex items-center gap-3 py-2">
              <div className={cn('flex size-9 shrink-0 flex-col items-center justify-center rounded-lg text-[11px] font-semibold leading-none', x.left <= 0.5 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : x.inDays < 0 ? 'bg-destructive/15 text-destructive' : x.inDays <= 3 ? 'bg-amber-500/15 text-amber-700' : 'bg-muted')}>
                <span className="text-sm">{x.day}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{envEmoji(x.env)} {x.env.name}</div>
                <div className="text-xs text-muted-foreground">{x.left <= 0.5 ? '✓ сплачено' : x.inDays < 0 ? 'дата минула' : x.inDays === 0 ? 'сьогодні' : `через ${x.inDays} дн.`}</div>
              </div>
              <span className={cn('whitespace-nowrap text-sm font-semibold tabular-nums', x.left <= 0.5 && 'text-muted-foreground line-through')}>{fmt(x.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Who spends */}
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle>Хто витрачає</CardTitle><CardDescription>Цього місяця, без накопичень</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {!peopleTotal && <p className="text-sm text-muted-foreground">Ще немає витрат.</p>}
          {Object.entries(people).sort((a, b) => b[1] - a[1]).map(([who, v], i) => (
            <div key={who} className="space-y-1">
              <div className="flex justify-between text-sm"><span className="font-medium">{who}</span><span className="tabular-nums">{fmt(v)} · {Math.round((v / peopleTotal) * 100)}%</span></div>
              <Progress value={(v / peopleTotal) * 100} className={i === 0 ? '[&>[data-slot=progress-indicator]]:bg-[var(--chart-2)]' : '[&>[data-slot=progress-indicator]]:bg-[var(--chart-4)]'} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trending categories */}
      <Card className="lg:col-span-6">
        <CardHeader><CardTitle>Темп статей</CardTitle><CardDescription>Скільки витрачено проти того, скільки місяця минуло ({Math.round(elapsedShare * 100)}%)</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {trending.map((x) => (
            <div key={x.e.id} className="space-y-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">{envEmoji(x.e)} {x.e.name}</span>
                <span className={cn('whitespace-nowrap tabular-nums', x.used > 1 ? 'font-semibold text-destructive' : x.vsPace > 0.1 ? 'font-semibold text-amber-600' : 'text-muted-foreground')}>{fmt(x.s)} / {fmt(x.p)}</span>
              </div>
              <div className="relative">
                <Progress value={Math.min(100, x.used * 100)} className={cn(x.used > 1 ? '[&>[data-slot=progress-indicator]]:bg-destructive' : x.vsPace > 0.1 ? '[&>[data-slot=progress-indicator]]:bg-amber-500' : '[&>[data-slot=progress-indicator]]:bg-emerald-500')} />
                <span className="absolute -top-0.5 h-2 w-0.5 rounded bg-foreground/60" style={{ left: `${Math.min(100, elapsedShare * 100)}%` }} title="сьогодні" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="lg:col-span-6">
        <CardHeader><CardTitle>Цілі</CardTitle><CardDescription>Подушка, відпустка й інші накопичення</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {state.envelopes.filter((e) => e.group === 'goals').map((e) => {
            const g = goalProgress(state, e, c, spent)
            const pct = g.hasTarget ? Math.min(100, (g.saved / g.amount!) * 100) : 0
            return (
              <div key={e.id} className="space-y-1">
                <div className="flex justify-between gap-2 text-sm"><span className="font-medium">{envEmoji(e)} {e.name}</span><span className="tabular-nums">{g.hasTarget ? `${Math.round(pct)}%` : fmt(g.saved)}</span></div>
                {g.hasTarget && <Progress value={pct} className="[&>[data-slot=progress-indicator]]:bg-emerald-500" />}
                <div className={cn('text-xs', g.hasTarget && !g.onTrack ? 'text-amber-600' : 'text-muted-foreground')}>{goalText(g) || `${fmt(g.plan)}/міс · ціль не задано — задайте на «Плані»`}</div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card className="lg:col-span-12">
          <CardHeader><CardTitle>Останні місяці</CardTitle><CardDescription>Витрачено проти плану і скільки відкладено</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={historyConfig} className="aspect-auto h-56 w-full">
              <BarChart data={history}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={38} tickFormatter={short} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="plan" fill="var(--color-plan)" radius={4} />
                <Bar dataKey="spent" fill="var(--color-spent)" radius={4} />
                <Bar dataKey="saved" fill="var(--color-saved)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
