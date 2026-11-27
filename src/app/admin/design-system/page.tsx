import { Star } from 'lucide-react'
import { TokenSwatches } from '@/components/admin/design-system/TokenSwatches'
import { ToastSample } from '@/components/admin/design-system/ToastSample'
import { Button } from '@/components/ui/button'
import { DecoDivider } from '@/components/ui/deco-divider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const metadata = { title: 'Design system' }

const TEXT_SAMPLES = [
    { cls: 'text-fg', label: 'fg - primary text' },
    { cls: 'text-fg-secondary', label: 'fg-secondary - body text' },
    { cls: 'text-fg-dim', label: 'fg-dim - deep muted text' },
    { cls: 'text-fg-muted', label: 'fg-muted - meta text' },
    { cls: 'text-brand', label: 'brand - brand text' },
    { cls: 'text-brand-soft-strong', label: 'brand-soft-strong - meaningful caramel' },
]

const PILLS = [
    { cls: 'bg-success-bg text-success', label: 'In pantry' },
    { cls: 'bg-warning-bg text-warning', label: 'Partial' },
    { cls: 'bg-missing-bg text-missing', label: 'Missing' },
    { cls: 'bg-danger-bg text-danger', label: 'Error' },
]

function SampleCocktailCard() {
    return (
        <div className="max-w-xs overflow-hidden rounded-2xl bg-surface shadow-xs">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to">
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-overlay px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-fg-on-image">
                    <span className="size-1.5 rounded-full bg-status-ready-dot" />
                    Makeable
                </span>
                <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-surface text-brand-soft-strong shadow-sm">
                    <Star size={14} fill="currentColor" />
                </span>
            </div>
            <div className="space-y-1.5 p-4">
                <h3 className="text-lg leading-tight text-fg">Old Fashioned</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                    <span className="font-medium text-brand-soft-strong">3 / 4 ingredients</span>
                    <span className="text-line-strong">·</span>
                    <span>5 min</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Bitter', 'Boozy'].map((f) => (
                        <span key={f} className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-brand">
                            {f}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ThemePanel({ title }: { title: string }) {
    return (
        <section className="space-y-6 rounded-2xl border border-line bg-canvas p-6 text-fg">
            <header className="space-y-2">
                <Eyebrow>{title}</Eyebrow>
                <DecoDivider />
            </header>

            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-fg">Text on surface</h2>
                <div className="space-y-1 rounded-lg bg-surface p-3">
                    {TEXT_SAMPLES.map((s) => (
                        <p key={s.cls} className={`text-sm ${s.cls}`}>{s.label}</p>
                    ))}
                </div>
                <p className="rounded-lg bg-surface-inverse p-3 text-sm text-fg-on-inverse">fg-on-inverse on surface-inverse</p>
            </div>

            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-fg">Status pills</h2>
                <div className="flex flex-wrap gap-2">
                    {PILLS.map((p) => (
                        <span key={p.label} className={`rounded-full px-3 py-1 text-xs font-medium ${p.cls}`}>{p.label}</span>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-fg">Components</h2>
                <div className="flex flex-wrap gap-2">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="pill">Pill</Button>
                    <ToastSample />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Input" />
                    <Select>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="one">One</SelectItem>
                            <SelectItem value="two">Two</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">Open dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Dialog</DialogTitle>
                            <DialogDescription>
                                Dialogs and select menus render in a portal, so they follow the page theme, not this panel.
                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-fg">Cocktail card</h2>
                <SampleCocktailCard />
            </div>

            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-fg">Tokens</h2>
                <TokenSwatches />
            </div>
        </section>
    )
}

export default function DesignSystemPage() {
    return (
        <div className="space-y-4 pb-8">
            <h1 className="text-2xl font-semibold">Design system</h1>
            <div className="grid gap-4 xl:grid-cols-2">
                <div className="light">
                    <ThemePanel title="Light" />
                </div>
                <div className="dark">
                    <ThemePanel title="Dark - Velvet Room" />
                </div>
            </div>
        </div>
    )
}
