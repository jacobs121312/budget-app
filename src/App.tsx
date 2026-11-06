import { useState } from 'react'
import { House, LayoutDashboard, ListChecks, PiggyBank, Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Footer } from '@/components/budget/footer'
import { HomeView } from '@/components/budget/home-view'
import { JarsView } from '@/components/budget/jars-view'
import { PlanView } from '@/components/budget/plan-view'
import { QuickAdd } from '@/components/budget/quick-add'
import { TrackView } from '@/components/budget/track-view'
import { useBudget } from '@/hooks/use-budget'
import type { BudgetState } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS: { id: BudgetState['tab']; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Огляд', icon: LayoutDashboard },
  { id: 'plan', label: 'План', icon: ListChecks },
  { id: 'track', label: 'Витрати', icon: Wallet },
  { id: 'jars', label: 'Банки', icon: PiggyBank },
]

export default function App() {
  const b = useBudget()
  const [adding, setAdding] = useState(false)
  const setTab = (t: string) => { b.setTab(t as BudgetState['tab']); window.scrollTo({ top: 0 }) }

  return (
    <Tabs value={b.state.tab} onValueChange={setTab} className="min-h-svh gap-0">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-sm">
              <House className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight sm:text-lg">Сімейний бюджет</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Спільний котел → кожна гривня має своє призначення</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TabsList className="hidden w-[480px] md:flex">
              {TABS.map((t) => <TabsTrigger key={t.id} value={t.id}><t.icon /> {t.label}</TabsTrigger>)}
            </TabsList>
            <Button className="hidden md:inline-flex" onClick={() => setAdding(true)}><Plus /> Витрата</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <TabsContent value="home"><HomeView b={b} /></TabsContent>
        <TabsContent value="plan"><PlanView b={b} /></TabsContent>
        <TabsContent value="track"><TrackView b={b} /></TabsContent>
        <TabsContent value="jars"><JarsView b={b} /></TabsContent>
        <Footer b={b} />
      </main>

      {/* Phones: app-style bottom navigation with a quick-add button in the middle. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {TABS.slice(0, 2).map((t) => <NavItem key={t.id} {...t} active={b.state.tab === t.id} onClick={() => setTab(t.id)} />)}
          <div className="flex justify-center">
            <button onClick={() => setAdding(true)} aria-label="Додати витрату"
              className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
              <Plus className="size-7" />
            </button>
          </div>
          {TABS.slice(2).map((t) => <NavItem key={t.id} {...t} active={b.state.tab === t.id} onClick={() => setTab(t.id)} />)}
        </div>
      </nav>

      <QuickAdd b={b} open={adding} onOpenChange={setAdding} />
      <Toaster position="top-center" />
    </Tabs>
  )
}

function NavItem({ label, icon: Icon, active, onClick }: { label: string; icon: typeof House; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('flex flex-col items-center gap-0.5 text-[11px]', active ? 'font-semibold text-primary' : 'text-muted-foreground')}>
      <Icon className="size-5" />
      {label}
    </button>
  )
}
