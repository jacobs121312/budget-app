import { useEffect, useState } from 'react'
import { Bot, ChevronRight, LayoutDashboard, ListChecks, PiggyBank, Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConnectBanner, SyncButton, ThemeButton, ThemeSwitch, syncLabel } from '@/components/budget/header-tools'
import { Footer } from '@/components/budget/footer'
import { HomeView } from '@/components/budget/home-view'
import { JarsView } from '@/components/budget/jars-view'
import { PlanView } from '@/components/budget/plan-view'
import { QuickAdd } from '@/components/budget/quick-add'
import { TrackView } from '@/components/budget/track-view'
import { useBudget, type Budget } from '@/hooks/use-budget'
import { monthLabel } from '@/lib/budget'
import type { BudgetState } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS: { id: BudgetState['tab']; label: string; icon: typeof Wallet; hint: string }[] = [
  { id: 'home', label: 'Огляд', icon: LayoutDashboard, hint: 'Стан місяця одним поглядом' },
  { id: 'plan', label: 'План', icon: ListChecks, hint: 'Спільний котел → кожна гривня має своє призначення' },
  { id: 'track', label: 'Витрати', icon: Wallet, hint: 'Скільки лишилось у кожній статті' },
  { id: 'jars', label: 'Банки', icon: PiggyBank, hint: 'Скільки й куди перекласти із зарплати' },
]

function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]', className)}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
        <path d="M4 11 12 5l8 6v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M9 20v-5h6v5" />
      </svg>
    </div>
  )
}

export default function App() {
  const b = useBudget()
  const [adding, setAdding] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const setTab = (t: string) => { b.setTab(t as BudgetState['tab']); window.scrollTo({ top: 0 }) }
  const tab = TABS.find((t) => t.id === b.state.tab) || TABS[0]

  // Keyboard: N or + — new expense; 1–4 — tabs. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest('input, textarea, select, [contenteditable], [role=dialog]')) return
      if (e.key === 'n' || e.key === 'т' || e.key === '+') { e.preventDefault(); setAdding(true) }
      const i = Number(e.key) - 1
      if (TABS[i]) { b.setTab(TABS[i].id); window.scrollTo({ top: 0 }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [b])

  return (
    <TooltipProvider delayDuration={300}>
      <Tabs value={b.state.tab} onValueChange={setTab} className="min-h-svh gap-0 lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
        <Sidebar b={b} active={b.state.tab} onTab={setTab} onAdd={() => setAdding(true)} onConnect={() => setConnecting(true)} />

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl lg:border-transparent lg:bg-background/70">
            <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <Logo />
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold leading-tight">Сімейний бюджет</h1>
                  <p className="truncate text-xs text-muted-foreground">{monthLabel(b.state.month)}</p>
                </div>
              </div>
              <nav aria-label="Де ви" className="hidden min-w-0 items-center gap-1.5 text-sm lg:flex">
                <span className="text-muted-foreground">Сімейний бюджет</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{tab.label}</span>
              </nav>
              <div className="flex items-center gap-1 md:gap-2">
                <TabsList className="mr-1 hidden w-[440px] md:flex lg:hidden">
                  {TABS.map((t, i) => <TabsTrigger key={t.id} value={t.id} title={`Клавіша ${i + 1}`}><t.icon /> {t.label}</TabsTrigger>)}
                </TabsList>
                <span className="hidden rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground lg:inline">{monthLabel(b.state.month)}</span>
                <SyncButton b={b} onConnect={() => setConnecting(true)} />
                <div className="lg:hidden"><ThemeButton /></div>
                <Button className="ml-1 hidden rounded-full md:inline-flex lg:hidden" onClick={() => setAdding(true)}><Plus /> Витрата</Button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] px-4 pt-4 sm:px-6 lg:px-8 lg:pt-2">
            <div className="mb-5 hidden lg:block">
              <h2 className="text-2xl font-semibold tracking-tight">{tab.label}</h2>
              <p className="text-sm text-muted-foreground">{tab.hint}</p>
            </div>
            <ConnectBanner b={b} onConnect={() => setConnecting(true)} />
            <TabsContent value="home"><HomeView b={b} onAdd={() => setAdding(true)} /></TabsContent>
            <TabsContent value="plan"><PlanView b={b} /></TabsContent>
            <TabsContent value="track"><TrackView b={b} /></TabsContent>
            <TabsContent value="jars"><JarsView b={b} /></TabsContent>
            <Footer b={b} open={connecting} setOpen={setConnecting} />
          </main>
        </div>

        {/* Phones: app-style bottom navigation with a quick-add button in the middle. */}
        <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-2xl border bg-card/90 shadow-lg backdrop-blur-xl md:hidden">
          <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
            {TABS.slice(0, 2).map((t) => <NavItem key={t.id} {...t} active={b.state.tab === t.id} onClick={() => setTab(t.id)} />)}
            <div className="flex justify-center">
              <button onClick={() => setAdding(true)} aria-label="Додати витрату"
                className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_var(--primary)] transition-transform active:scale-95">
                <Plus className="size-6" />
              </button>
            </div>
            {TABS.slice(2).map((t) => <NavItem key={t.id} {...t} active={b.state.tab === t.id} onClick={() => setTab(t.id)} />)}
          </div>
        </nav>

        <QuickAdd b={b} open={adding} onOpenChange={setAdding} />
        <Toaster position="top-center" />
      </Tabs>
    </TooltipProvider>
  )
}

function Sidebar({ b, active, onTab, onAdd, onConnect }: { b: Budget; active: string; onTab: (t: string) => void; onAdd: () => void; onConnect: () => void }) {
  const s = syncLabel(b)
  return (
    <aside className="sticky top-0 hidden h-svh flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
      <div className="flex items-center gap-3 px-2 pt-1">
        <Logo />
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight">Сімейний бюджет</div>
          <div className="truncate text-xs text-muted-foreground">спільний котел</div>
        </div>
      </div>

      <Button className="h-10 justify-between rounded-xl" onClick={onAdd}>
        <span className="flex items-center gap-2"><Plus /> Додати витрату</span>
        <kbd className="rounded-md bg-white/20 px-1.5 text-[11px] font-medium">N</kbd>
      </Button>

      <nav className="space-y-1">
        <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Головне</div>
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => onTab(t.id)} aria-current={active === t.id ? 'page' : undefined}
            className={cn('group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm transition-colors',
              active === t.id ? 'bg-sidebar-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground')}>
            {active === t.id && <span className="absolute -left-4 h-5 w-1 rounded-r-full bg-primary" />}
            <t.icon className={cn('size-4', active === t.id && 'text-primary')} />
            <span className="flex-1 text-left">{t.label}</span>
            <kbd className="text-[11px] text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">{i + 1}</kbd>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border bg-card p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bot className="size-4" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Агент у Telegram</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn('size-1.5 rounded-full', s.dot)} />{s.text}</div>
            </div>
          </div>
          {!b.sync && <Button size="sm" variant="secondary" className="mt-3 w-full rounded-lg" onClick={onConnect}>Підключити</Button>}
        </div>
        <ThemeSwitch />
      </div>
    </aside>
  )
}

function NavItem({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Wallet; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} className={cn('flex h-full flex-col items-center justify-center gap-0.5 text-[11px] transition-colors active:scale-95', active ? 'font-semibold text-primary' : 'text-muted-foreground')}>
      <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active && 'bg-primary/10')}><Icon className="size-5" /></span>
      {label}
    </button>
  )
}
