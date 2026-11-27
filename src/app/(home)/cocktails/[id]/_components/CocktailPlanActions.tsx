'use client'

import { useState } from 'react'
import { CalendarDays, FlaskConical, Printer } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import PlanCocktailDialog from '@/components/home/planned-cocktails/dialog/PlanCocktailDialog'
import MakeCocktailDialog from '@/components/home/cocktails/MakeCocktailDialog'
import { usePlannedCocktailState } from '@/hooks/queries/use-planned-cocktails'
import { usePlannedCocktailMutations } from '@/hooks/mutations/use-planned-cocktail-mutations'
import { queryKeys } from '@/lib/query-keys'
import type { PlannedCocktailState } from '@/lib/api/planned-cocktails.api'

/**
 * Signed-in actions for the cocktail hero: plan state, Make / Plan / PDF /
 * Mark done, the mobile action bar and the two dialogs. Plan state comes from
 * the query cache (`plannedCocktails.state`) instead of an ad-hoc fetch.
 */
export function CocktailPlanActions({ cocktailId, cocktailName }: { cocktailId: string; cocktailName: string }) {
    const { data: session, status } = useSession()
    const isAuthenticated = status === 'authenticated'
    const qc = useQueryClient()

    const [planDialogOpen, setPlanDialogOpen] = useState(false)
    const [makeDialogOpen, setMakeDialogOpen] = useState(false)

    const { data: planState } = usePlannedCocktailState(cocktailId, { enabled: isAuthenticated })
    const { complete } = usePlannedCocktailMutations()

    const stateKey = queryKeys.plannedCocktails.state(cocktailId)
    const refreshPlanState = () => qc.invalidateQueries({ queryKey: stateKey })

    const handleCompleted = async () => {
        const plannedCocktailId = planState?.plannedCocktailId
        if (!plannedCocktailId) return
        try {
            await complete.mutateAsync({ id: plannedCocktailId, cocktailId })
            qc.setQueryData<PlannedCocktailState>(stateKey, (prev) => (prev ? { ...prev, status: 'done' } : prev))
            toast.success('Cocktail marked as done! Pantry updated')
        } catch {
            toast.error('Could not mark as done')
        }
    }

    if (!session?.user) return null

    const completing = complete.isPending

    return (
        <>
            {planState?.exists && (
                <div className="text-sm text-fg-on-image/90 flex items-center gap-2">
                    {planState.status === 'planned' && (
                        <>
                            <CalendarDays size={13} aria-hidden="true" />
                            Planned
                        </>
                    )}
                    {planState.status === 'done' && <>✓ Done</>}
                </div>
            )}

            <div className="hidden md:flex flex-wrap gap-2 mt-auto pt-6 border-t border-fg-on-image/15">
                <button
                    type="button"
                    onClick={() => setMakeDialogOpen(true)}
                    className="px-4 py-2.5 rounded-full bg-fg-on-image text-surface-inverse text-sm flex items-center gap-2 hover:bg-fg-on-image/90 whitespace-nowrap"
                >
                    <FlaskConical size={14} aria-hidden="true" /> Make now
                </button>

                <button
                    type="button"
                    onClick={() => setPlanDialogOpen(true)}
                    className="px-4 py-2.5 rounded-full border border-fg-on-image/30 text-sm flex items-center gap-2 hover:bg-fg-on-image/10 whitespace-nowrap"
                >
                    <CalendarDays size={14} aria-hidden="true" /> Plan
                </button>

                <a
                    href={`/api/cocktails/${cocktailId}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-full border border-fg-on-image/30 text-sm flex items-center gap-2 hover:bg-fg-on-image/10 whitespace-nowrap"
                >
                    <Printer size={14} aria-hidden="true" /> PDF
                </a>

                {planState?.status === 'planned' && (
                    <button
                        type="button"
                        onClick={handleCompleted}
                        disabled={completing}
                        className="px-4 py-2.5 rounded-full border border-fg-on-image/30 text-sm hover:bg-fg-on-image/10 flex items-center gap-2 whitespace-nowrap"
                    >
                        {completing ? 'Saving…' : 'Mark done'}
                    </button>
                )}
            </div>

            {planState?.status === 'planned' && (
                <button
                    type="button"
                    onClick={handleCompleted}
                    disabled={completing}
                    className="md:hidden mt-2 px-4 py-2 rounded-full border border-fg-on-image/30 hover:bg-fg-on-image/10 flex items-center gap-2 w-fit"
                >
                    {completing ? 'Saving…' : 'Mark done'}
                </button>
            )}

            {/* Mobile action bar (fixed; its DOM position does not matter). */}
            <div className="md:hidden fixed inset-x-4 bottom-24 z-40">
                <div className="rounded-2xl border border-line-strong/50 bg-canvas/95 backdrop-blur-md px-2 py-2 shadow-[0_12px_30px_rgba(27,28,26,0.18)] flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setMakeDialogOpen(true)}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-fg-on-brand flex items-center justify-center gap-2 font-label text-[11px] uppercase tracking-widest"
                    >
                        <FlaskConical size={14} aria-hidden="true" /> Make now
                    </button>
                    <button
                        type="button"
                        onClick={() => setPlanDialogOpen(true)}
                        className="flex-1 px-4 py-3 rounded-xl border border-line-strong bg-surface-muted text-brand flex items-center justify-center gap-2 font-label text-[11px] uppercase tracking-widest"
                    >
                        <CalendarDays size={14} aria-hidden="true" /> Plan
                    </button>
                </div>
            </div>

            <PlanCocktailDialog
                cocktailId={cocktailId}
                cocktailName={cocktailName}
                open={planDialogOpen}
                onOpenChange={setPlanDialogOpen}
                onPlanned={refreshPlanState}
            />
            <MakeCocktailDialog
                cocktailId={cocktailId}
                cocktailName={cocktailName}
                open={makeDialogOpen}
                onOpenChange={setMakeDialogOpen}
                onMade={refreshPlanState}
            />
        </>
    )
}
