'use client'

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import AddPantryItemDialog from '@/components/home/pantry/dialog/AddPantryItemDialog'
import SuggestionDialog from '@/components/home/suggestions/SuggestionDialog'

/** "Add to pantry" / "Suggest a change" buttons and their dialogs. */
export function IngredientActions({ ingredientId, ingredientName }: { ingredientId: string; ingredientName: string }) {
    const { data: session } = useSession()
    const [openAdd, setOpenAdd] = useState(false)
    const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false)

    return (
        <>
            <div className="ml-8 mt-2 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => setOpenAdd(true)}
                    className="px-5 py-2 rounded-lg bg-surface/90 hover:bg-surface border border-surface/60 text-brand text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
                >
                    Add to pantry
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (!session?.user) {
                            window.location.href = `/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`
                            return
                        }
                        setSuggestionDialogOpen(true)
                    }}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg border border-fg-on-brand text-fg-on-brand hover:bg-fg-on-brand/15 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg-on-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
                >
                    <MessageSquarePlus size={15} aria-hidden="true" />
                    Suggest a change
                </button>
            </div>

            <AddPantryItemDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={() => {}} />
            <SuggestionDialog
                open={suggestionDialogOpen}
                onOpenChange={setSuggestionDialogOpen}
                defaultType="MODIFY_INGREDIENT"
                targetId={ingredientId}
                targetName={ingredientName}
            />
        </>
    )
}
