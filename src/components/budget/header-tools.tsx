import { useState } from 'react'
import { Bot, Monitor, Moon, RefreshCw, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Budget } from '@/hooks/use-budget'
import { getTheme, setTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_UI = {
  system: { icon: Monitor, label: 'Тема: як у системі' },
  light: { icon: Sun, label: 'Тема: світла' },
  dark: { icon: Moon, label: 'Тема: темна' },
}

export function ThemeButton() {
  const [t, setT] = useState<Theme>(getTheme)
  const { icon: Icon, label } = THEME_UI[t]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={() => { const n = NEXT[t]; setT(n); setTheme(n) }}>
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Sync state as a small dot; tap to refresh, or to connect when not connected. */
export function SyncButton({ b, onConnect }: { b: Budget; onConnect: () => void }) {
  const ui = {
    off: { dot: 'bg-muted-foreground/40', label: 'Агент не підключений — дані тільки в цьому браузері' },
    syncing: { dot: 'bg-blue-500 animate-pulse', label: 'Синхронізація…' },
    ok: { dot: 'bg-emerald-500', label: 'Синхронізовано з агентом · оновити' },
    error: { dot: 'bg-destructive', label: 'Немає зв’язку з агентом · спробувати ще' },
  }[b.status]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={ui.label} className="relative" onClick={() => (b.sync ? void b.pull() : onConnect())}>
          {b.sync ? <RefreshCw className={cn(b.status === 'syncing' && 'animate-spin')} /> : <Bot />}
          <span className={cn('absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-background', ui.dot)} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{ui.label}</TooltipContent>
    </Tooltip>
  )
}

const BANNER_KEY = 'family-budget-hide-connect'

/** Shown until the agent is connected (or the banner is closed). */
export function ConnectBanner({ b, onConnect }: { b: Budget; onConnect: () => void }) {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(BANNER_KEY) === '1' } catch { return false } })
  if (b.sync || hidden) return null
  const close = () => { setHidden(true); try { localStorage.setItem(BANNER_KEY, '1') } catch { /* private mode */ } }
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] p-3 text-sm sm:flex-nowrap">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"><Bot className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">Підключіть агента</div>
        <div className="text-xs text-muted-foreground">Витрати з monobank і Telegram з’являться тут самі, на всіх пристроях.</div>
      </div>
      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground sm:order-last" aria-label="Сховати" onClick={close}><X className="size-4" /></Button>
      <Button size="sm" className="w-full rounded-full sm:w-auto" onClick={onConnect}>Підключити</Button>
    </div>
  )
}

/** Light / dark / system as a three-way switch (sidebar). */
export function ThemeSwitch() {
  const [t, setT] = useState<Theme>(getTheme)
  return (
    <div role="radiogroup" aria-label="Тема" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
      {(['light', 'dark', 'system'] as const).map((k) => {
        const { icon: Icon, label } = THEME_UI[k]
        return (
          <button key={k} role="radio" aria-checked={t === k} aria-label={label} title={label}
            onClick={() => { setT(k); setTheme(k) }}
            className={cn('flex h-8 items-center justify-center rounded-lg text-muted-foreground transition-colors', t === k && 'bg-card text-foreground shadow-sm ring-1 ring-border')}>
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}

export function syncLabel(b: Budget) {
  return {
    off: { dot: 'bg-muted-foreground/40', text: 'Тільки в цьому браузері' },
    syncing: { dot: 'bg-blue-500 animate-pulse', text: 'Синхронізація…' },
    ok: { dot: 'bg-emerald-500', text: 'Синхронізовано' },
    error: { dot: 'bg-destructive', text: 'Немає зв’язку' },
  }[b.status]
}
