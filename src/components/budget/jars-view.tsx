import { CreditCard, ExternalLink, PiggyBank } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Budget } from '@/hooks/use-budget'
import { amountOf, fmt, goalProgress, incomeFor, spentBy, splitSalary, type SplitLine } from '@/lib/budget'
import type { Owner } from '@/lib/types'
import { Columns } from './layout'
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

  const side = (
    <>
      <Alert>
        <PiggyBank />
        <AlertDescription>
          Зарплати кінця місяця — бюджет наступного. У день зарплати кожен розкладає свою частину: у банки — кнопкою «Поповнити», решта лишається на картці. Агент у Telegram нагадає те саме.
        </AlertDescription>
      </Alert>
      <Card className="order-last lg:order-none">
        <CardHeader>
          <CardTitle>Усі банки</CardTitle>
          <CardDescription>Скільки на місяць іде в кожну банку і хто кладе.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {!jars.size && <p className="text-sm text-muted-foreground">Банок ще не прив’язано. Надішліть агенту посилання на банки monobank.</p>}
          {[...jars.entries()].map(([url, j]) => {
            const env = j.goal ? state.envelopes.find((e) => e.id === j.goal) : null
            const g = env ? goalProgress(state, env, c, spent) : null
            return (
              <div key={url} className="space-y-1 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">🏦 {j.name}</span>
                  <span className="whitespace-nowrap font-semibold tabular-nums">{fmt(j.me + j.wife)}/міс</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="min-w-0">
                    {[j.me && `${people.me}: ${fmt(j.me)}`, j.wife && `${people.wife}: ${fmt(j.wife)}`].filter(Boolean).join(' · ')}
                    {env && ` · цього місяця ${fmt(spent[env.id] || 0)}`}
                    {g?.hasTarget && <span className="block">{goalText(g)}</span>}
                  </span>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-0.5 font-semibold text-primary">Поповнити <ExternalLink className="size-3" /></a>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </>
  )

  const main = (
    <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
      {([['me', meInc, me], ['wife', wifeInc, wife]] as const).map(([who, inc, split]) => inc && (
        <Card key={who}>
          <CardHeader>
            <CardTitle>💰 {inc.name || people[who]}</CardTitle>
            <CardDescription>Що зробити в день зарплати ({people[who]})</CardDescription>
            <CardAction className="font-bold tabular-nums">{fmt(amountOf(state, inc, 0))}</CardAction>
          </CardHeader>
          <CardContent className="divide-y">
            {split.lines.map((l, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className={l.jar ? 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12' : 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted'}>
                  {l.jar ? <PiggyBank className="size-4 text-primary" /> : <CreditCard className="size-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-medium leading-snug">{l.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{l.jar ? 'у банку' : 'лишити на картці'}{l.detail ? ` · ${l.detail}` : ''}</div>
                </div>
                <span className={l.jar ? 'whitespace-nowrap font-bold tabular-nums' : 'whitespace-nowrap font-semibold tabular-nums text-muted-foreground'}>{fmt(l.amount)}</span>
                {l.jar && (
                  <Button asChild size="icon" className="size-8 shrink-0 rounded-full" aria-label="Поповнити банку" title="Поповнити банку">
                    <a href={l.jar} target="_blank" rel="noopener noreferrer"><ExternalLink /></a>
                  </Button>
                )}
              </div>
            ))}
            {split.shortfall > 0 && <p className="pt-2 text-sm font-medium text-destructive">Цієї зарплати не вистачає на все: бракує {fmt(split.shortfall)}.</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return <Columns side={side} main={main} stickySide />
}
