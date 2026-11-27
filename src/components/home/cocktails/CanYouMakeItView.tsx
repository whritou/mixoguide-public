import { SaveMyBar } from '@/components/home/landing/SaveMyBar'
import { isRequiredIngredient, joinNames, type CanYouMakeItIngredient, type CanYouMakeItState } from './can-you-make-it-state'

type Props = {
    ingredients: CanYouMakeItIngredient[]
    ids: string[]
    state: CanYouMakeItState
    onToggle: (id: string) => void
}

function resultText(state: CanYouMakeItState): string {
    if (state.status === 'empty') return 'Tick what you have at home.'
    if (state.status === 'ready') return 'You can make it tonight.'
    return `You have ${state.have} of ${state.total}. Missing: ${joinNames(state.missing)}.`
}

export function CanYouMakeItView({ ingredients, ids, state, onToggle }: Props) {
    return (
        <section aria-labelledby="can-you-make-it" className="flex flex-col gap-4 rounded-xl border border-line bg-surface-subtle p-5">
            <h3 id="can-you-make-it" className="font-serif text-xl">Can you make it?</h3>
            <ul className="flex flex-col gap-2">
                {ingredients.map(ingredient => {
                    const inputId = `cymi-${ingredient.id}`
                    return (
                        <li key={ingredient.id} className="flex items-center gap-3">
                            <input
                                id={inputId}
                                type="checkbox"
                                checked={ids.includes(ingredient.id)}
                                onChange={() => onToggle(ingredient.id)}
                                className="h-4 w-4 accent-brand"
                            />
                            <label htmlFor={inputId} className="text-sm text-fg">
                                {ingredient.name}
                                {!isRequiredIngredient(ingredient) && <span className="text-fg-dim"> (optional)</span>}
                            </label>
                        </li>
                    )
                })}
            </ul>
            <div aria-live="polite" className="flex flex-col gap-1 text-sm">
                <p className="font-medium text-fg">{resultText(state)}</p>
                {state.alsoCount > 0 && (
                    <p className="text-fg-muted">
                        With these you can also make {state.alsoCount} {state.alsoCount === 1 ? 'cocktail' : 'cocktails'}
                    </p>
                )}
            </div>
            <SaveMyBar ids={ids} />
        </section>
    )
}
