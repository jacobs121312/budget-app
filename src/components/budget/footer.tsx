import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Budget } from '@/hooks/use-budget'
import { monthKey } from '@/lib/budget'

const DEFAULT_AGENT = 'https://budget-agent.savych.workers.dev'

export function Footer({ b }: { b: Budget }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(b.sync?.url || DEFAULT_AGENT)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const connect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url.trim())) { toast.error('Адреса має починатися з https://'); return }
    setBusy(true)
    try {
      await b.connect(url, token)
      setOpen(false); setToken('')
      toast.success('Агента підключено — дані синхронізовано')
    } catch {
      toast.error('Не вдалося підключитися: перевірте адресу й токен.')
    } finally { setBusy(false) }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(b.state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `budget-${monthKey()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const importJson = (f: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const s = JSON.parse(String(reader.result))
        if (!s || s.v !== 3 || !Array.isArray(s.envelopes)) throw new Error('bad')
        if (window.confirm('Замінити поточні дані даними з файлу?')) b.replaceAll(s)
      } catch { toast.error('Не вдалося прочитати файл бюджету.') }
    }
    reader.readAsText(f)
  }

  const statusText = { off: '', syncing: 'синхронізація…', ok: '✓ синхронізовано', error: 'немає зв’язку з агентом' }[b.status]

  return (
    <footer className="mt-8 space-y-1 pb-24 text-center text-xs text-muted-foreground lg:pb-6">
      <p>
        {b.sync ? 'Дані синхронізуються з агентом у Telegram.' : 'Дані зберігаються тільки в цьому браузері.'}{' '}
        <span className={b.status === 'error' ? 'text-destructive' : 'text-emerald-600'}>{statusText}</span>
      </p>
      <div className="flex items-center justify-center gap-1">
        {b.sync
          ? <Button variant="link" size="sm" onClick={() => { if (window.confirm('Відключити агента? Поточні дані лишаться в цьому браузері.')) b.disconnect() }}>Відключити агента</Button>
          : <Button variant="link" size="sm" onClick={() => setOpen(true)}>Підключити агента</Button>}
        ·<Button variant="link" size="sm" onClick={exportJson}>Експорт</Button>
        ·<Button variant="link" size="sm" onClick={() => file.current?.click()}>Імпорт</Button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = '' }} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={connect} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Підключити агента</DialogTitle>
              <DialogDescription>Калькулятор і Telegram-бот працюватимуть з одними даними на всіх ваших пристроях.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="agent-url">Адреса агента</Label>
              <Input id="agent-url" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-token">Токен доступу (WEB_TOKEN)</Label>
              <Input id="agent-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy || !token.trim()}>{busy ? 'Підключаю…' : 'Підключити'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </footer>
  )
}
