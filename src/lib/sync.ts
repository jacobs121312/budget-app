// Talking to the budget agent (Cloudflare Worker). The agent's copy is the source of truth:
// plan edits are pushed with PUT /api/plan; month records go through their own endpoints.

import type { BudgetState } from './types'

export const SYNC_KEY = 'family-budget-agent'

export interface SyncConfig { url: string; token: string }

export function loadSync(): SyncConfig | null {
  try { return JSON.parse(localStorage.getItem(SYNC_KEY) || 'null') } catch { return null }
}
export function saveSync(cfg: SyncConfig | null) {
  try { if (cfg) localStorage.setItem(SYNC_KEY, JSON.stringify(cfg)); else localStorage.removeItem(SYNC_KEY) } catch { /* ignore */ }
}

export async function api<T = { state: BudgetState; rev: number }>(cfg: SyncConfig, method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(cfg.url + path, {
    method,
    headers: { authorization: 'Bearer ' + cfg.token, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

export const planOf = (s: BudgetState) => ({ rate: s.rate, people: s.people, incomes: s.incomes, firsts: s.firsts, envelopes: s.envelopes })
