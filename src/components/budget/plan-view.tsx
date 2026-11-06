import { ExternalLink, PiggyBank, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { Budget } from '@/hooks/use-budget'
import { GROUPS, amountOf, envEmoji, fmt, goalProgress, monthLabel, num, payoffOf, spentBy, uid, untilMonth, type GoalProgress } from '@/lib/budget'
import type { Envelope, GroupId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { EditRow, MiniField } from './edit-row'
import { Columns, Step, groupAccent, groupBar } from './layout'

export function goalText(g: GoalProgress) {
  const cash = g.cash ? ` (з них $${g.cash.usd} готівкою ≈ ${fmt(g.cash.uah)})` : ''
  if (!g.hasTarget) return g.saved ? `накопичено ${fmt(g.saved)}${cash}` : ''
  const pct = Math.min(100, Math.round((g.saved / g.amount!) * 100))
  const head = `накопичено ${fmt(g.saved)} з ${fmt(g.amount!)} (${pct}%)${cash}`
  if (g.done) return `${head} · ✓ зібрано`
  if (!g.date) return head + (g.byPlan ? ` · за планом — ${monthLabel(g.byPlan).toLowerCase()}` : '')
  if (g.onTrack) return `${head} · встигаєте до ${untilMonth(g.date)}`
  return `${head} · щоб встигнути, треба ${fmt(g.neededPerMonth!)}/міс`
}

export function PlanView({ b }: { b: Budget }) {
  const { state, c, update } = b
  const u = Math.round(c.unallocated)
  const pct = (v: number) => (c.avail > 0 ? Math.round((v / c.avail) * 100) : 0)
  const kinds = { needs: 0, wants: 0, savings: 0 }
  for (const g of GROUPS) kinds[g.kind] += c.groups[g.id] || 0

  const status = u < 0
    ? { label: 'Розподілено більше, ніж є', hint: 'Зменшіть якісь статті', tone: 'text-destructive' }
    : u > 0
      ? { label: 'Нерозподілено', hint: 'Ці гроші без призначення', tone: 'text-amber-600 dark:text-amber-400' }
      : { label: 'Усе розподілено', hint: c.restEnv ? `Залишок → «${c.restEnv.name || 'решта'}»` : 'Кожна гривня має призначення', tone: 'text-emerald-600 dark:text-emerald-400' }

  const toSavings = () => update((d) => {
    const cc = c
    let goal = d.envelopes.find((e) => e.group === 'goals')
    if (!goal) { d.envelopes.push({ id: uid(), group: 'goals', name: 'Накопичення', type: 'rest', value: 0 }); return }
    if (goal.type === 'uah') goal.value = Math.round(num(goal.value) + cc.unallocated)
    else { goal.value = Math.round((cc.plan[goal.id] || 0) + cc.unallocated); goal.type = 'uah' }
  })

  const side = (
    <>
      <Card>
        <CardHeader>
          <CardTitle><Step n={1} />Доходи сім'ї</CardTitle>
          <CardDescription>Усі доходи йдуть у спільний бюджет.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.incomes.map((i, idx) => (
            <EditRow key={i.id} name={i.name} type={i.type} value={i.value} types={['uah', 'usd']}
              hint={i.type === 'usd' ? `= ${fmt(amountOf(state, i, 0))}` : undefined}
              onName={(v) => update((d) => { d.incomes[idx].name = v })}
              onType={(t) => update((d) => { d.incomes[idx].type = t as 'uah' | 'usd' })}
              onValue={(v) => update((d) => { d.incomes[idx].value = v })}
              onRemove={() => update((d) => { d.incomes.splice(idx, 1) })} />
          ))}
          <Button variant="ghost" size="sm" className="mt-1 text-primary" onClick={() => update((d) => { d.incomes.push({ id: uid(), name: '', type: 'uah', value: 0 }) })}>
            <Plus /> Додати дохід
          </Button>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
            <span className="text-sm text-muted-foreground">Курс, грн/$</span>
            <Input type="number" step="0.01" inputMode="decimal" value={state.rate} className="h-8 w-24 bg-background text-right tabular-nums"
              onChange={(e) => update((d) => { d.rate = num(e.target.value) })} />
            <a className="flex items-center gap-1 text-xs font-medium text-primary" href="https://bank.gov.ua/ua/markets/exchangerates" target="_blank" rel="noopener">НБУ <ExternalLink className="size-3" /></a>
          </div>
          <Separator className="my-3" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Спільний бюджет</span>
            <span className="text-2xl font-bold tabular-nums">{fmt(c.income)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><Step n={2} />Спершу</CardTitle>
          <CardDescription>Відраховується від усього доходу (десятина тощо).</CardDescription>
          <CardAction className="font-semibold tabular-nums">{c.firsts ? '−' + fmt(c.firsts) : ''}</CardAction>
        </CardHeader>
        <CardContent>
          {state.firsts.map((f, idx) => (
            <EditRow key={f.id} name={f.name} type={f.type} value={f.value} types={['percent', 'uah', 'usd']}
              hint={f.type !== 'uah' ? `= ${fmt(amountOf(state, f, c.income))}` : undefined}
              onName={(v) => update((d) => { d.firsts[idx].name = v })}
              onType={(t) => update((d) => { d.firsts[idx].type = t as 'percent' | 'uah' | 'usd' })}
              onValue={(v) => update((d) => { d.firsts[idx].value = v })}
              onRemove={() => update((d) => { d.firsts.splice(idx, 1) })} />
          ))}
          <Button variant="ghost" size="sm" className="mt-1 text-primary" onClick={() => update((d) => { d.firsts.push({ id: uid(), name: '', type: 'percent', value: 0 }) })}>
            <Plus /> Додати
          </Button>
          <Separator className="my-3" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">До розподілу</span>
            <span className="text-xl font-bold tabular-nums">{fmt(c.avail)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden lg:flex">
        <CardContent className="space-y-1">
          <div className="text-sm text-muted-foreground">{status.label}</div>
          <div className={cn('text-3xl font-bold tabular-nums tracking-tight', status.tone)}>{fmt(u)}</div>
          <div className="text-xs text-muted-foreground">{status.hint}</div>
          {u > 0 && <Button size="sm" className="mt-2" onClick={toSavings}><PiggyBank /> У накопичення</Button>}
        </CardContent>
      </Card>

      <Card className="order-last lg:order-none">
        <CardHeader>
          <CardTitle>Перевірка за 50/30/20</CardTitle>
          <CardDescription>Частка від суми «до розподілу». Орієнтир, не правило.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          {([
            ['Необхідне', pct(kinds.needs), 'ціль ≤ 50%', pct(kinds.needs) > 50, 'bg-blue-500/10 text-blue-700 dark:text-blue-300'],
            ['Бажання', pct(kinds.wants), 'ціль ≤ 30%', pct(kinds.wants) > 30, 'bg-amber-500/10 text-amber-700 dark:text-amber-300'],
            ['Накопичення', pct(kinds.savings), 'ціль ≥ 20%', pct(kinds.savings) < 20, 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'],
          ] as const).map(([t, v, g, off, cls]) => (
            <div key={t} className={cn('rounded-lg p-3 text-center', cls)}>
              <div className="text-xs font-semibold">{t}</div>
              <div className="text-2xl font-bold tabular-nums text-foreground">{v}%</div>
              <div className={cn('text-[11px]', off ? 'text-destructive' : 'text-muted-foreground')}>{g}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )

  const main = (
    <div className="space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {GROUPS.map((g, gi) => <GroupCard key={g.id} b={b} group={g.id} step={gi + 3} />)}
    </div>
  )

  return (
    <>
      <Columns side={side} main={main} />
      {/* Phones: the status sits in a bar at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t bg-background/90 px-4 py-2 backdrop-blur md:bottom-0 md:pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">{status.label}</div>
            <div className="text-xs text-muted-foreground">{status.hint}</div>
          </div>
          <div className="flex items-center gap-2">
            {u > 0 && <Button size="sm" onClick={toSavings}>У накопичення</Button>}
            <span className={cn('text-2xl font-bold tabular-nums', status.tone)}>{fmt(u)}</span>
          </div>
        </div>
      </div>
    </>
  )
}

function GroupCard({ b, group, step }: { b: Budget; group: GroupId; step: number }) {
  const { state, c, update } = b
  const g = GROUPS.find((x) => x.id === group)!
  const envs = state.envelopes.filter((e) => e.group === group)
  const spent = spentBy(state)
  const edit = (id: string, fn: (e: Envelope) => void) => update((d) => { const e = d.envelopes.find((x) => x.id === id); if (e) fn(e) })

  const setType = (e: Envelope, t: string) => update((d) => {
    const cur = d.envelopes.find((x) => x.id === e.id)!
    if (t === 'rest') {
      for (const o of d.envelopes) if (o.id !== e.id && o.type === 'rest') { o.type = 'uah'; o.value = Math.round(c.plan[o.id] || 0) }
    } else if (cur.type === 'rest') cur.value = Math.round(c.plan[cur.id] || 0)
    cur.type = t as Envelope['type']
  })

  const remove = (e: Envelope) => {
    const has = state.expenses.filter((x) => x.env === e.id)
    if (has.length && !window.confirm('У цій статті вже є витрати цього місяця. Видалити разом з ними?')) return
    for (const x of has) void b.deleteExpense(x.id)
    update((d) => { d.envelopes = d.envelopes.filter((x) => x.id !== e.id) })
  }

  // Debt summary: when money frees up as installments end.
  let debtSummary: React.ReactNode = null
  if (group === 'debts') {
    const ends = new Map<string, { names: string[]; freed: number }>()
    let totalLeft = 0, monthly = 0
    for (const e of envs) {
      const po = payoffOf(state, e, c)
      totalLeft += Math.max(0, num(e.debt?.left)); monthly += c.plan[e.id] || 0
      if (po.last) { const x = ends.get(po.last) || { names: [], freed: 0 }; x.names.push(e.name); x.freed += amountOf(state, e, c.avail); ends.set(po.last, x) }
    }
    let freed = 0
    debtSummary = totalLeft > 0 && (
      <div className="mt-3 space-y-1 rounded-lg bg-destructive/10 p-3 text-sm">
        <div>Загальний борг: <b className="tabular-nums">{fmt(totalLeft)}</b> · щомісяця {fmt(monthly)}</div>
        {[...ends.keys()].sort().map((k) => { const x = ends.get(k)!; freed += x.freed; return (
          <div key={k} className="font-medium text-emerald-700 dark:text-emerald-400">{monthLabel(k)} — останній платіж: {x.names.join(', ')}. Далі +{fmt(freed)}/міс</div>
        ) })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={groupAccent[group]}><Step n={step} />{g.name}</CardTitle>
        <CardDescription>{g.hint}</CardDescription>
        <CardAction className={cn('font-semibold tabular-nums', groupAccent[group])}>{fmt(c.groups[group] || 0)}</CardAction>
      </CardHeader>
      <CardContent>
        {envs.map((e) => {
          const gp = group === 'goals' ? goalProgress(state, e, c, spent) : null
          const po = e.debt ? payoffOf(state, e, c) : null
          return (
            <EditRow key={e.id} name={e.name} type={e.type} value={e.value} types={['uah', 'usd', 'percent', 'rest']}
              hint={e.type === 'rest' ? `= ${fmt(c.plan[e.id] || 0)}` : e.type !== 'uah' ? `= ${fmt(c.plan[e.id] || 0)}` : undefined}
              hintTone={e.type === 'rest' ? 'good' : 'muted'}
              jar={!!e.jar}
              emoji={envEmoji(e)}
              onName={(v) => edit(e.id, (x) => { x.name = v })}
              onType={(t) => setType(e, t)}
              onValue={(v) => edit(e.id, (x) => { x.value = v })}
              onRemove={() => remove(e)}
              detailsOpen={!!e.debt && !num(e.debt.left)}
              details={group === 'fixed' ? (
                <MiniField label="день оплати" width="@lg:w-16" placeholder="?" value={e.payDay ?? ''} onChange={(v) => edit(e.id, (x) => { const d = Math.round(num(v)); x.payDay = d >= 1 ? Math.min(31, d) : null })} />
              ) : e.debt ? (
                <>
                  <MiniField label="залишок боргу" value={e.debt.left} onChange={(v) => edit(e.id, (x) => { x.debt!.left = num(v) })} />
                  <MiniField label="день платежу" width="@lg:w-16" placeholder="?" value={e.debt.day ?? ''} onChange={(v) => edit(e.id, (x) => { const d = Math.round(num(v)); x.debt!.day = d >= 1 ? Math.min(31, d) : null })} />
                </>
              ) : group === 'goals' ? (
                <>
                  <MiniField label="ціль, грн" placeholder="—" value={e.goal?.amount || ''} onChange={(v) => edit(e.id, (x) => {
                    const n = Math.round(num(v)); if (n > 0) x.goal = { ...x.goal, amount: n }; else if (x.goal) { delete x.goal.amount; if (!x.goal.date) delete x.goal }
                  })} />
                  <MiniField label="до" type="month" width="@lg:w-36" value={e.goal?.date || ''} onChange={(v) => edit(e.id, (x) => { x.goal = { ...x.goal, date: /^\d{4}-\d{2}$/.test(v) ? v : null } })} />
                  <MiniField label="вже є, грн" placeholder="0" value={Math.round(num(e.balance) + (spent[e.id] || 0)) || ''} onChange={(v) => edit(e.id, (x) => { x.balance = Math.max(0, Math.round(num(v)) - Math.round(spent[e.id] || 0)) })} />
                  <MiniField label="готівкою $" width="@lg:w-20" placeholder="0" value={e.cashUsd || ''} onChange={(v) => edit(e.id, (x) => { const n = Math.round(num(v) * 100) / 100; if (n > 0) x.cashUsd = n; else delete x.cashUsd })} />
                </>
              ) : undefined}>
              {group === 'fixed' && e.payDay && <span className="text-xs text-muted-foreground">оплата {e.payDay}-го</span>}
              {e.debt && (
                <span className={cn('text-xs', po?.done ? 'font-semibold text-emerald-600' : 'text-muted-foreground')}>
                  {po?.done ? '✓ закрито' : po?.last ? `борг ${fmt(num(e.debt.left))} · останній платіж ${monthLabel(po.last).toLowerCase()} · ще ${po.n} плат.${e.debt.day ? ` · ${e.debt.day}-го` : ''}` : 'вкажіть залишок боргу й платіж'}
                </span>
              )}
              {gp && goalText(gp) && (
                <div className="w-full space-y-1">
                  {gp.hasTarget && <Progress value={Math.min(100, (gp.saved / gp.amount!) * 100)} className={cn('h-1.5', groupBar.goals)} />}
                  <div className={cn('text-xs', gp.done ? 'font-semibold text-emerald-600' : gp.hasTarget && !gp.onTrack ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{goalText(gp)}</div>
                </div>
              )}
            </EditRow>
          )
        })}
        <Button variant="ghost" size="sm" className="mt-1 text-primary" onClick={() => update((d) => {
          d.envelopes.push({ id: uid(), group, name: '', type: 'uah', value: 0, ...(group === 'debts' ? { debt: { left: 0, day: null } } : {}) })
        })}>
          <Plus /> {group === 'debts' ? 'Додати розстрочку' : 'Додати статтю'}
        </Button>
        {debtSummary}
      </CardContent>
    </Card>
  )
}
