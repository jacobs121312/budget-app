// All budget state and actions in one hook. Plan edits are saved locally and, when the agent
// is connected, pushed to it (debounced); spends and closing a month go through the agent's API.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { calc, closeMonth as closeMonthRule, monthKey, round2, uid } from '@/lib/budget'
import { loadLocal, normalize, saveLocal } from '@/lib/storage'
import { api, loadSync, planOf, saveSync, type SyncConfig } from '@/lib/sync'
import type { BudgetState } from '@/lib/types'

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'error'

export function useBudget() {
  const [state, setState] = useState<BudgetState>(loadLocal)
  const [sync, setSync] = useState<SyncConfig | null>(loadSync)
  const [status, setStatus] = useState<SyncStatus>(sync ? 'syncing' : 'off')
  const stateRef = useRef(state)
  const syncRef = useRef(sync)
  const pushTimer = useRef<number | null>(null)
  stateRef.current = state
  syncRef.current = sync

  const commit = useCallback((next: BudgetState) => {
    stateRef.current = next
    setState(next)
    saveLocal(next)
  }, [])

  const applyServer = useCallback((server: BudgetState) => {
    commit(normalize({ ...server, tab: stateRef.current.tab }))
  }, [commit])

  const pushPlan = useCallback(async () => {
    const cfg = syncRef.current
    if (!cfg) return
    try {
      const r = await api(cfg, 'PUT', '/api/plan', { plan: planOf(stateRef.current) })
      // Keep local plan edits; take the month records from the agent (card spends may have arrived).
      commit({ ...stateRef.current, expenses: r.state.expenses, history: r.state.history, month: r.state.month })
      setStatus('ok')
    } catch { setStatus('error') }
  }, [commit])

  const flushPush = useCallback(async () => {
    if (pushTimer.current === null) return
    window.clearTimeout(pushTimer.current)
    pushTimer.current = null
    await pushPlan()
  }, [pushPlan])

  /** Change the plan: `fn` edits a copy of the document. */
  const update = useCallback((fn: (draft: BudgetState) => void) => {
    const draft = structuredClone(stateRef.current)
    fn(draft)
    commit(draft)
    if (syncRef.current) {
      if (pushTimer.current !== null) window.clearTimeout(pushTimer.current)
      pushTimer.current = window.setTimeout(() => { pushTimer.current = null; void pushPlan() }, 700)
    }
  }, [commit, pushPlan])

  const setTab = useCallback((tab: BudgetState['tab']) => {
    const next = { ...stateRef.current, tab }
    commit(next)
  }, [commit])

  const pull = useCallback(async () => {
    const cfg = syncRef.current
    if (!cfg) return
    setStatus('syncing')
    try {
      await flushPush()
      const r = await api<{ state: BudgetState | null; rev: number }>(cfg, 'GET', '/api/state')
      if (!r.state || !r.state.envelopes?.length) {
        // First connection: the agent has no plan yet — give it everything from this browser.
        const r2 = await api(cfg, 'PUT', '/api/plan', { state: stateRef.current })
        applyServer(r2.state)
      } else applyServer(r.state)
      setStatus('ok')
    } catch { setStatus('error') }
  }, [applyServer, flushPush])

  /** A month-record change that goes through the agent when connected. */
  const mutate = useCallback(async (method: string, path: string, body: unknown, local: (draft: BudgetState) => void) => {
    const cfg = syncRef.current
    if (!cfg) { const d = structuredClone(stateRef.current); local(d); commit(d); return true }
    try {
      await flushPush()
      const r = await api(cfg, method, path, body)
      applyServer(r.state)
      setStatus('ok')
      return true
    } catch {
      setStatus('error')
      toast.error('Не вдалося зберегти: немає зв’язку з агентом. Спробуйте ще раз.')
      return false
    }
  }, [applyServer, commit, flushPush])

  const addExpense = useCallback((env: string, amount: number, note = '', who = '') =>
    mutate('POST', '/api/expenses', { env, amount: round2(amount), note, who }, (d) => {
      d.expenses.push({ id: uid(), env, amount: round2(amount), note, who, date: new Date().toISOString(), source: 'manual' })
    }), [mutate])

  const deleteExpense = useCallback((id: string) =>
    mutate('DELETE', '/api/expenses/' + encodeURIComponent(id), undefined, (d) => { d.expenses = d.expenses.filter((x) => x.id !== id) }), [mutate])

  const closeMonth = useCallback(() =>
    mutate('POST', '/api/close-month', {}, (d) => { closeMonthRule(d, monthKey()) }), [mutate])

  const connect = useCallback(async (url: string, token: string) => {
    const cfg = { url: url.trim().replace(/\/+$/, ''), token: token.trim() }
    await api(cfg, 'GET', '/api/state') // throws on a wrong address or token
    saveSync(cfg)
    syncRef.current = cfg
    setSync(cfg)
    await pull()
  }, [pull])

  const disconnect = useCallback(() => {
    saveSync(null)
    syncRef.current = null
    setSync(null)
    setStatus('off')
  }, [])

  const replaceAll = useCallback((s: BudgetState) => { commit(normalize({ ...s, tab: stateRef.current.tab })); if (syncRef.current) void pushPlan() }, [commit, pushPlan])

  useEffect(() => {
    if (sync) void pull()
    const onVisible = () => { if (!document.hidden && syncRef.current) void pull() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const c = useMemo(() => calc(state), [state])
  return { state, c, update, setTab, addExpense, deleteExpense, closeMonth, sync, status, connect, disconnect, pull, replaceAll }
}

export type Budget = ReturnType<typeof useBudget>
