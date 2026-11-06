// Budget rules. They mirror the agent (budget-agent/src/budget.js and payday.js):
// change both together so the calculator and the bot always show the same numbers.

import type { BudgetState, Envelope, First, GroupId, HistoryEntry, Income, Owner } from './types'

export const GROUPS: { id: GroupId; name: string; kind: 'needs' | 'wants' | 'savings'; hint: string }[] = [
  { id: 'fixed', name: "Обов'язкові платежі", kind: 'needs', hint: 'Однакова сума щомісяця: оренда, комуналка, зв’язок.' },
  { id: 'debts', name: 'Розстрочки та кредити', kind: 'needs', hint: 'Платіж іде в план; залишок боргу показує, коли закриєте.' },
  { id: 'daily', name: 'Щоденні витрати', kind: 'needs', hint: 'Ліміти на місяць; контроль — на вкладці «Витрати».' },
  { id: 'personal', name: 'Особисті та розваги', kind: 'wants', hint: 'Кишенькові кожному й спільні розваги.' },
  { id: 'goals', name: 'Накопичення та цілі', kind: 'savings', hint: 'Стаття «решта» забирає все нерозподілене.' },
]

const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень']
const MONTHS_GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']

export const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
export const round2 = (n: number) => Math.round(n * 100) / 100
export const uid = () => Math.random().toString(36).slice(2, 10)

export function fmt(n: number) {
  if (!Number.isFinite(n)) n = 0
  const r = Math.round(n)
  return (r < 0 ? '−' : '') + Math.abs(r).toLocaleString('uk-UA').replace(/ | /g, ' ') + ' грн'
}

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}
export function untilMonth(key: string) {
  const [y, m] = key.split('-')
  return `${MONTHS_GEN[Number(m) - 1]} ${y}`
}
export function addMonths(key: string, n: number) {
  const [y, m] = key.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + n, 1))
}
export function monthsBetween(from: string, to: string) {
  const [a, b] = [from.split('-').map(Number), to.split('-').map(Number)]
  return (b[0] - a[0]) * 12 + (b[1] - a[1])
}

export function amountOf(state: BudgetState, item: Income | First | Envelope, base: number) {
  if (item.type === 'usd') return num(item.value) * num(state.rate)
  if (item.type === 'percent') return (base * num(item.value)) / 100
  if (item.type === 'rest') return 0
  return num(item.value)
}

export interface Calc {
  income: number
  firsts: number
  avail: number
  plan: Record<string, number>
  unallocated: number
  restEnv: Envelope | null
  groups: Record<string, number>
}

export function calc(state: BudgetState): Calc {
  const income = state.incomes.reduce((s, i) => s + amountOf(state, i, 0), 0)
  const firsts = state.firsts.reduce((s, f) => s + amountOf(state, f, income), 0)
  const avail = income - firsts
  const plan: Record<string, number> = {}
  let allocated = 0
  let restEnv: Envelope | null = null
  for (const e of state.envelopes) {
    if (e.type === 'rest') { if (!restEnv) restEnv = e; plan[e.id] = 0; continue }
    plan[e.id] = amountOf(state, e, avail)
    if (e.debt) plan[e.id] = Math.min(plan[e.id], Math.max(0, num(e.debt.left)))
    allocated += plan[e.id]
  }
  const leftover = avail - allocated
  if (restEnv) plan[restEnv.id] = Math.max(0, leftover)
  const unallocated = restEnv ? Math.min(0, leftover) : leftover
  const groups: Record<string, number> = Object.fromEntries(GROUPS.map((g) => [g.id, 0]))
  for (const e of state.envelopes) groups[e.group] = (groups[e.group] || 0) + plan[e.id]
  return { income, firsts, avail, plan, unallocated, restEnv, groups }
}

export function spentBy(state: BudgetState) {
  const s: Record<string, number> = {}
  for (const x of state.expenses) s[x.env] = (s[x.env] || 0) + num(x.amount)
  return s
}

export function payoffOf(state: BudgetState, e: Envelope, c: Calc) {
  const left = Math.max(0, num(e.debt?.left))
  const pay = amountOf(state, e, c.avail)
  if (left <= 0.009) return { done: true, n: 0, last: null as string | null }
  if (pay <= 0) return { done: false, n: null as number | null, last: null as string | null }
  const n = Math.ceil(left / pay - 0.0001)
  return { done: false, n, last: addMonths(state.month, n - 1) }
}

export interface GoalProgress {
  hasTarget: boolean
  saved: number
  plan: number
  cash: { usd: number; uah: number; inJar: number } | null
  amount?: number
  left?: number
  date?: string | null
  monthsLeft?: number | null
  neededPerMonth?: number | null
  byPlan?: string | null
  onTrack?: boolean
  done?: boolean
}

export function goalProgress(state: BudgetState, e: Envelope, c = calc(state), spent = spentBy(state)): GoalProgress {
  const cashUah = Math.round(num(e.cashUsd) * num(state.rate))
  const inJar = Math.round(num(e.balance) + (spent[e.id] || 0))
  const saved = inJar + cashUah
  const plan = Math.round(c.plan[e.id] || 0)
  const cash = e.cashUsd ? { usd: num(e.cashUsd), uah: cashUah, inJar } : null
  if (!e.goal || !(num(e.goal.amount) > 0)) return { hasTarget: false, saved, plan, cash }
  const amount = Math.round(num(e.goal.amount))
  const left = Math.max(0, amount - saved)
  const monthsLeft = e.goal.date ? Math.max(0, monthsBetween(state.month, e.goal.date) + 1) : null
  const neededPerMonth = monthsLeft ? Math.max(0, Math.ceil((amount - num(e.balance) - cashUah) / monthsLeft)) : null
  const afterThis = left - Math.max(0, plan - (spent[e.id] || 0))
  const byPlan = left <= 0 || afterThis <= 0 ? state.month : plan > 0 ? addMonths(state.month, Math.ceil(afterThis / plan)) : null
  const onTrack = left <= 0 || (e.goal.date ? byPlan !== null && byPlan <= e.goal.date : true)
  return { hasTarget: true, amount, saved, left, plan, date: e.goal.date || null, monthsLeft, neededPerMonth, byPlan, onTrack, done: left <= 0, cash }
}

/** Close the month: archive totals, pay down debts, carry savings into goal balances. */
export function closeMonth(state: BudgetState, nowKey = monthKey()): HistoryEntry {
  const c = calc(state)
  const spent = spentBy(state)
  let plan = 0, total = 0, saved = 0
  const over: HistoryEntry['over'] = []
  for (const e of state.envelopes) {
    const s = spent[e.id] || 0
    if (e.group === 'goals') { saved += s; continue }
    plan += c.plan[e.id]
    total += s
    if (s - c.plan[e.id] > 0.5) over.push({ name: e.name || 'Без назви', amount: Math.round(s - c.plan[e.id]) })
  }
  const entry = { month: state.month, income: Math.round(c.income), plan: Math.round(plan), spent: Math.round(total), saved: Math.round(saved), over }
  state.history = state.history.filter((h) => h.month !== state.month)
  state.history.push(entry)
  if (state.history.length > 24) state.history = state.history.slice(-24)
  for (const e of state.envelopes) {
    if (e.debt && spent[e.id]) e.debt.left = round2(Math.max(0, num(e.debt.left) - spent[e.id]))
    if (e.group === 'goals' && spent[e.id]) e.balance = Math.round(num(e.balance) + spent[e.id])
  }
  state.expenses = []
  state.month = state.month === nowKey ? addMonths(nowKey, 1) : nowKey
  return entry
}

// ---------------------------------------------------------------- salary split (payday)

const MINE = /(^|[^\p{L}])(мо[їяє]|мій)([^\p{L}]|$)/u

export function pocketOwner(e: Envelope): Owner | null {
  const n = (e.name || '').toLowerCase()
  if (MINE.test(n)) return 'me'
  if (/дружин|жінк/.test(n)) return 'wife'
  return null
}

export function incomeFor(state: BudgetState, owner: Owner) {
  return state.incomes.find((i) => i.owner === owner)
    || state.incomes.find((i) => (owner === 'wife' ? /дружин|жінк/i : MINE).test((i.name || '').toLowerCase()))
    || state.incomes[owner === 'wife' ? 1 : 0] || null
}

export interface SplitLine { label: string; amount: number; jar: string | null; card: boolean; detail?: string; goal?: string }

function salaryTargets(state: BudgetState, owner: Owner, c: Calc) {
  const payer = state.payer || 'me'
  const plan = (e: Envelope) => c.plan[e.id] || 0
  const out: { label: string; target: number; jar: string | null; card: boolean; detail?: string }[] = []
  const add = (label: string, sum: number, jar: string | null, card: boolean, detail?: string) => {
    if (Math.round(sum) > 0) out.push({ label, target: Math.round(sum), jar, card, detail })
  }
  const mine = state.envelopes.filter((e) => (e.group === 'fixed' || e.group === 'debts') && (e.payer || payer) === owner)
  const inJar = mine.filter((e) => e.jar)
  add("Обов'язкові платежі й розстрочки", inJar.reduce((s, e) => s + plan(e), 0), inJar[0]?.jar || null, false, inJar.map((e) => e.name).join(', '))
  for (const e of mine.filter((x) => !x.jar)) add(e.name + (e.debt?.day ? ` (до ${e.debt.day} числа)` : ''), plan(e), null, true)
  if (owner !== payer) {
    const daily = state.envelopes.filter((e) => e.group === 'daily' && !e.jar)
    add('Щоденні витрати', daily.reduce((s, e) => s + plan(e), 0), null, true, daily.map((e) => e.name).join(', '))
    const byJar = new Map<string, Envelope[]>()
    for (const e of state.envelopes.filter((x) => x.group === 'daily' && x.jar)) byJar.set(e.jar!, [...(byJar.get(e.jar!) || []), e])
    for (const [jar, list] of byJar) add(list.map((e) => e.name).join(', '), list.reduce((s, e) => s + plan(e), 0), jar, false)
  }
  for (const e of state.envelopes.filter((x) => x.group === 'personal')) {
    const who = pocketOwner(e)
    if (who === owner || (who === null && owner !== payer)) add(e.name, plan(e), null, true)
  }
  return out
}

export function splitSalary(state: BudgetState, owner: Owner, amount: number, goalsAllocated: Record<string, number> = {}, c = calc(state)) {
  const lines: SplitLine[] = []
  const add = (l: Omit<SplitLine, 'amount'>, sum: number) => { if (Math.round(sum) > 0) lines.push({ ...l, amount: Math.round(sum) }) }
  for (const f of state.firsts.filter((x) => x.type === 'percent')) add({ label: f.name || 'Відрахування', jar: f.jar || null, card: !f.jar }, (amount * num(f.value)) / 100)
  let left = amount - lines.reduce((s, l) => s + l.amount, 0)
  let shortfall = 0
  for (const t of salaryTargets(state, owner, c)) {
    const give = Math.max(0, Math.min(left, t.target))
    if (give > 0) { add({ label: t.label, jar: t.jar, card: t.card, detail: t.detail }, give); left -= give }
    shortfall += t.target - give
  }
  const goals: Record<string, number> = {}
  const goalEnvs = state.envelopes.filter((e) => e.group === 'goals')
  for (const e of goalEnvs.filter((x) => x.type !== 'rest')) {
    const give = Math.max(0, Math.min(left, (c.plan[e.id] || 0) - num(goalsAllocated[e.id])))
    if (give > 0) { goals[e.id] = give; add({ label: e.name, jar: e.jar || null, card: false, goal: e.id }, give); left -= give }
  }
  const rest = goalEnvs.find((e) => e.type === 'rest')
  if (rest && left > 0.5) { goals[rest.id] = left; add({ label: rest.name, jar: rest.jar || null, card: false, goal: rest.id }, left) }
  return { lines, goals, shortfall: Math.round(shortfall) }
}
