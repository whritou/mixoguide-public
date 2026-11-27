'use client'

import { useDemoBar } from '@/hooks/useDemoBar'
import { useMakeablePreview } from '@/hooks/queries/useMakeablePreview'
import { CanYouMakeItView } from './CanYouMakeItView'
import { deriveCanMakeState, type CanYouMakeItIngredient } from './can-you-make-it-state'

const NO_INITIAL: string[] = []

type Props = { cocktailId: string; ingredients: CanYouMakeItIngredient[] }

export default function CanYouMakeIt({ cocktailId, ingredients }: Props) {
    const { ids, toggle } = useDemoBar(NO_INITIAL)
    const { data: preview, isCurrent } = useMakeablePreview(ids, cocktailId)
    const state = deriveCanMakeState(ingredients, ids, isCurrent ? preview : preview && { makeableCount: preview.makeableCount })

    return <CanYouMakeItView ingredients={ingredients} ids={ids} state={state} onToggle={toggle} />
}
