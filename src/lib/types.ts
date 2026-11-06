// The budget document (v3). The same JSON lives in this browser and in the agent.

export type Owner = 'me' | 'wife'
export type ItemType = 'uah' | 'usd' | 'percent' | 'rest'
export type GroupId = 'fixed' | 'debts' | 'daily' | 'personal' | 'goals'

export interface Income { id: string; name: string; type: 'uah' | 'usd'; value: number; owner?: Owner }
export interface First { id: string; name: string; type: 'percent' | 'uah' | 'usd'; value: number; jar?: string }

export interface Envelope {
  id: string
  group: GroupId
  name: string
  type: ItemType
  value: number
  jar?: string
  payer?: Owner
  debt?: { left: number; day: number | null }
  /** Day of the month a fixed payment is due (rent, utilities). */
  payDay?: number | null
  goal?: { amount?: number; date?: string | null }
  balance?: number
  cashUsd?: number
}

export interface Expense {
  id: string
  env: string
  amount: number
  note: string
  who: string
  date: string
  source?: 'mono' | 'manual' | 'web' | 'receipt'
  monoId?: string
  merchant?: string
  receipt?: string
}

export interface HistoryEntry {
  month: string; income: number; plan: number; spent: number; saved: number
  over: { name: string; amount: number }[]
  /** Spent per envelope name (from Dec 2026 on). */
  byEnv?: Record<string, { plan: number; spent: number }>
}

export interface BudgetState {
  v: 3
  tab: 'home' | 'plan' | 'track' | 'jars'
  rate: number
  people: string[]
  incomes: Income[]
  firsts: First[]
  envelopes: Envelope[]
  month: string
  expenses: Expense[]
  history: HistoryEntry[]
  payer?: Owner
  memory?: unknown
  debtsSeeded?: boolean
  wifeCreditMoved?: boolean
}
