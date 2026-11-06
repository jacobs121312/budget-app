import { House } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Footer } from '@/components/budget/footer'
import { JarsView } from '@/components/budget/jars-view'
import { PlanView } from '@/components/budget/plan-view'
import { TrackView } from '@/components/budget/track-view'
import { useBudget } from '@/hooks/use-budget'
import type { BudgetState } from '@/lib/types'

export default function App() {
  const b = useBudget()
  return (
    <Tabs value={b.state.tab} onValueChange={(t) => b.setTab(t as BudgetState['tab'])} className="min-h-svh gap-0">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-sm">
              <House className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Сімейний бюджет</h1>
              <p className="text-xs text-muted-foreground">Спільний котел → кожна гривня має своє призначення</p>
            </div>
          </div>
          <TabsList className="w-full lg:w-[420px]">
            <TabsTrigger value="plan">План</TabsTrigger>
            <TabsTrigger value="track">Витрати</TabsTrigger>
            <TabsTrigger value="jars">Банки</TabsTrigger>
          </TabsList>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <TabsContent value="plan"><PlanView b={b} /></TabsContent>
        <TabsContent value="track"><TrackView b={b} /></TabsContent>
        <TabsContent value="jars"><JarsView b={b} /></TabsContent>
        <Footer b={b} />
      </main>
      <Toaster position="top-center" />
    </Tabs>
  )
}
