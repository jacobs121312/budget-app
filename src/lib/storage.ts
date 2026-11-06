// This browser's copy of the budget (localStorage) and the starting plan for a new device.
// When the agent is connected, its copy is the source of truth (see sync.ts).

import { monthKey, num, uid } from './budget'
import type { BudgetState, Envelope } from './types'

export const KEY = 'family-budget-v3'

const JAR = (id: string) => `https://send.monobank.ua/jar/${id}`
const JAR_PAYMENTS = JAR('6qwZnfpwXd') // «Платежі місяця»
const JAR_IRREGULAR = JAR('4RvPNkBMQg') // «Нерегулярні витрати»
const JAR_CUSHION = JAR('4UqLgrh6Ec') // «Подушка безпеки»
const JAR_BIG = JAR('4TE4Xidz24') // «Вел. пок./ відпустка»
// Closed jars: links saved in a browser before are replaced or dropped on load.
const OLD_JARS: Record<string, string | null> = { '6PRgxfTfAk': null, '4vfx32aLxD': JAR_CUSHION }

const env = (group: Envelope['group'], name: string, type: Envelope['type'], value: number, extra: Partial<Envelope> = {}): Envelope =>
  ({ id: uid(), group, name, type, value, ...extra })

export function defaultState(): BudgetState {
  return {
    v: 3, tab: 'plan', rate: 45.5, people: ['Я', 'Дружина'],
    incomes: [
      { id: uid(), name: 'Моя зарплата', type: 'usd', value: 600 },
      { id: uid(), name: 'Зарплата дружини', type: 'uah', value: 40000 },
    ],
    firsts: [{ id: uid(), name: 'Десятина', type: 'percent', value: 10 }],
    envelopes: [
      env('fixed', 'Оренда', 'usd', 200, { jar: JAR_PAYMENTS }),
      env('fixed', 'Комуналка', 'uah', 2500, { jar: JAR_PAYMENTS }),
      env('fixed', "Зв'язок та інтернет", 'uah', 400, { jar: JAR_PAYMENTS }),
      env('fixed', 'Агент (Claude API)', 'usd', 6, { jar: JAR_PAYMENTS }),
      env('debts', 'АЛЛО', 'uah', 2212.43, { debt: { left: 15487, day: 6 }, jar: JAR_PAYMENTS }),
      env('debts', 'FOXTROT', 'uah', 766.5, { debt: { left: 4599, day: 6 }, jar: JAR_PAYMENTS }),
      env('debts', 'Розстрочка на картку', 'uah', 392.36, { debt: { left: 1791.59, day: 29 }, jar: JAR_PAYMENTS }),
      env('debts', 'Кредит дружини', 'uah', 4000, { debt: { left: 12000, day: null }, payer: 'wife' }),
      env('daily', 'Їжа та побут', 'uah', 17500),
      env('daily', 'Транспорт / пальне', 'uah', 2500),
      env('daily', 'Аптека', 'uah', 700),
      env('daily', 'Лікарі та обстеження', 'uah', 800, { jar: JAR_IRREGULAR }),
      env('daily', 'Одяг і взуття', 'uah', 1500, { jar: JAR_IRREGULAR }),
      env('daily', 'Подарунки та непередбачене', 'uah', 1500, { jar: JAR_IRREGULAR }),
      env('personal', 'Мої кишенькові', 'uah', 2000),
      env('personal', 'Кишенькові дружини', 'uah', 2000),
      env('personal', 'Моя стрижка', 'uah', 650),
      env('personal', 'Манікюр дружини', 'uah', 1100),
      env('personal', 'Кафе та розваги разом', 'uah', 2500),
      env('goals', 'Подушка безпеки', 'percent', 10, { jar: JAR_CUSHION }),
      env('goals', 'Відпустка / великі покупки', 'rest', 0, { jar: JAR_BIG }),
    ],
    month: monthKey(), expenses: [], history: [], debtsSeeded: true, wifeCreditMoved: true,
  }
}

/** Fill gaps in a saved document and swap links to closed jars. */
export function normalize(s: BudgetState): BudgetState {
  const d = defaultState()
  for (const k of ['people', 'incomes', 'firsts', 'expenses', 'history'] as const) if (!Array.isArray(s[k])) (s as any)[k] = d[k]
  if (!s.month) s.month = monthKey()
  if (!['plan', 'track', 'jars'].includes(s.tab)) s.tab = 'plan'
  s.rate = num(s.rate) || d.rate
  for (const e of s.envelopes) {
    const id = e.jar?.split('/').pop()
    if (id && id in OLD_JARS) { const to = OLD_JARS[id]; if (to) e.jar = to; else delete e.jar }
  }
  return s
}

export function loadLocal(): BudgetState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s && s.v === 3 && Array.isArray(s.envelopes)) return normalize(s)
    }
  } catch { /* storage unavailable or broken: start fresh */ }
  return defaultState()
}

export function saveLocal(s: BudgetState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode etc. */ }
}
