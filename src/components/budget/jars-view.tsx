import { ChevronDown, CreditCard, ExternalLink, PiggyBank } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Budget } from '@/hooks/use-budget'
import { amountOf, envEmoji, fmt, goalProgress, incomeFor, spentBy, splitSalary, type SplitLine } from '@/lib/budget'
import type { Owner } from '@/lib/types'
import { Progress } from '@/components/ui/progress'
import { goalText } from './plan-view'

export function JarsView({ b }: { b: Budget }) {
  const { state, c } = b
  const people: Record<Owner, string> = { me: state.people[0] || 'Я', wife: state.people[1] || 'Дружина' }
  const meInc = incomeFor(state, 'me'), wifeInc = incomeFor(state, 'wife')
  const me = splitSalary(state, 'me', meInc ? amountOf(state, meInc, 0) : 0, {}, c)
  const wife = splitSalary(state, 'wife', wifeInc ? amountOf(state, wifeInc, 0) : 0, me.goals, c)

  // All jars: monthly amount and who puts how much.
  const jars = new Map<string, { name: string; me: number; wife: number; goal?: string }>()
  const put = (l: SplitLine, who: Owner) => {
    if (!l.jar) return
    const j = jars.get(l.jar) || { name: l.label, me: 0, wife: 0, goal: l.goal }
    j[who] += l.amount
    jars.set(l.jar, j)
  }
  me.lines.forEach((l) => put(l, 'me'))
  wife.lines.forEach((l) => put(l, 'wife'))
  const spent = spentBy(state)

  const plans = ([['me', meInc, me], ['wife', wifeInc, wife]] as const).filter(([, inc]) => inc).map(([who, inc, split]) => {
    const toJars = split.lines.filter((l) => l.jar).reduce((sum, l) => sum + l.amount, 0)
    const onCard = split.lines.filter((l) => !l.jar).reduce((sum, l) => sum + l.amount, 0)
    return { who, inc: inc!, split, total: amountOf(state, inc!, 0), toJars, onCard }
  })

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* Payday at a glance */}
      <Card>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"><PiggyBank className="size-4" /></span>
            <p>Зарплати кінця місяця — бюджет наступного. У день зарплати кожен <b className="font-medium text-foreground">поповнює свої банки</b>, а решта лишається на картці на щоденні витрати. Агент у Telegram нагадає.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {plans.map((x) => (
              <button key={x.who} onClick={() => document.getElementById(`jars-${x.who}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="space-y-2 text-left">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{people[x.who]}</span>
                  <span className="num text-xl font-semibold">{fmt(x.total)}</span>
                </div>
                <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                  <div className="bg-primary" style={{ width: `${(x.toJars / Math.max(x.total, 1)) * 100}%` }} />
                  <div className="bg-[var(--chart-4)]" style={{ width: `${(x.onCard / Math.max(x.total, 1)) * 100}%` }} />
                </div>
                <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" />у банки <b className="num font-semibold text-foreground">{fmt(x.toJars)}</b></span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--chart-4)]" />на картці <b className="num font-semibold text-foreground">{fmt(x.onCard)}</b></span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What each of you does on payday */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
        {plans.map((x) => {
          const jarsL = x.split.lines.filter((l) => l.jar)
          const cardL = x.split.lines.filter((l) => !l.jar)
          return (
            <Card key={x.who} id={`jars-${x.who}`} className="scroll-mt-24">
              <CardHeader>
                <CardTitle>💰 {x.inc.name || people[x.who]}</CardTitle>
                <CardDescription>Що зробити в день зарплати</CardDescription>
                <CardAction className="num font-semibold">{fmt(x.total)}</CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <section>
                  <div className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <span>1 · Поповнити банки</span><span className="num">{fmt(x.toJars)}</span>
                  </div>
                  {!jarsL.length && <p className="py-2 text-sm text-muted-foreground">Банок для цієї зарплати немає.</p>}
                  <div className="divide-y">
                    {jarsL.map((l, i) => (
                      <div key={i} className="flex items-center gap-3 py-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12"><PiggyBank className="size-4 text-primary" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{l.label}</div>
                          {l.detail && <div className="truncate text-xs text-muted-foreground">{l.detail}</div>}
                        </div>
                        <span className="num whitespace-nowrap font-semibold">{fmt(l.amount)}</span>
                        <Button asChild size="sm" className="h-8 shrink-0 rounded-full px-3" aria-label={`Поповнити банку «${l.label}»`}>
                          <a href={l.jar || undefined} target="_blank" rel="noopener noreferrer"><span className="hidden sm:inline">Поповнити</span><ExternalLink /></a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
                <details className="group rounded-xl bg-muted/50 px-3 py-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <span>2 · Лишити на картці</span>
                    <span className="flex items-center gap-1"><span className="num">{fmt(x.onCard)}</span><ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /></span>
                  </summary>
                  <div className="mt-1 divide-y">
                    {cardL.map((l, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{l.label}</div>
                          {l.detail && <div className="truncate text-xs text-muted-foreground">{l.detail}</div>}
                        </div>
                        <span className="num whitespace-nowrap text-sm text-muted-foreground">{fmt(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                </details>
                {x.split.shortfall > 0 && <p className="text-sm font-medium text-destructive">Цієї зарплати не вистачає на все: бракує {fmt(x.split.shortfall)}.</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Every jar */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold">Усі банки</h3>
          <span className="text-xs text-muted-foreground">скільки на місяць і хто кладе</span>
        </div>
        {!jars.size && <p className="text-sm text-muted-foreground">Банок ще не прив’язано. Надішліть агенту посилання на банки monobank.</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 lg:gap-4">
          {[...jars.entries()].map(([url, j]) => {
            const env = j.goal ? state.envelopes.find((e) => e.id === j.goal) : null
            const g = env ? goalProgress(state, env, c, spent) : null
            const pct = g?.hasTarget ? Math.min(100, (g.saved / g.amount!) * 100) : null
            return (
              <Card key={url} className="gap-3 py-4">
                <CardContent className="space-y-3 px-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-base" aria-hidden>{env ? envEmoji(env) : '🏦'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-medium leading-snug">{j.name}</div>
                      <div className="text-xs text-muted-foreground">{[j.me && `${people.me} ${fmt(j.me)}`, j.wife && `${people.wife} ${fmt(j.wife)}`].filter(Boolean).join(' · ')}</div>
                    </div>
                    <span className="num whitespace-nowrap text-sm font-semibold">{fmt(j.me + j.wife)}<span className="font-normal text-muted-foreground">/міс</span></span>
                  </div>
                  {pct !== null && (
                    <div className="space-y-1">
                      <Progress value={pct} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-[var(--chart-5)]" />
                      <div className="truncate text-xs text-muted-foreground">{g && goalText(g)}</div>
                    </div>
                  )}
                  <Button asChild variant="secondary" size="sm" className="w-full rounded-full">
                    <a href={url} target="_blank" rel="noopener noreferrer">Поповнити <ExternalLink /></a>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
