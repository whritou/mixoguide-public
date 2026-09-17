import type { FieldConfig, CustomFieldConfig } from '@/components/crud/types'
import {
    COCKTAIL_TECHNIQUES,
    COCKTAIL_FLAVORS,
    COCKTAIL_OCCASIONS,
    COCKTAIL_DIFFICULTIES,
} from '@/types/models/cocktail'
import { z } from 'zod'

interface SelectOption { label: string; value: string }

interface CocktailFieldDeps {
    glassOptions:       SelectOption[]
    barToolOptions:     SelectOption[]
    mainAlcoholSelect:  CustomFieldConfig['render']
    ingredientRepeater: CustomFieldConfig['render']
}

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

export function buildCocktailFields(deps: CocktailFieldDeps): FieldConfig[] {
    return [
        { name: 'name',             label: 'Name',             type: 'text',     required: true },
        { name: 'description',      label: 'Description',      type: 'textarea' },
        { name: 'fullDescription',  label: 'Full Description', type: 'textarea' },
        { name: 'instructionsText', label: 'Instructions',     type: 'textarea', description: 'One instruction per line', required: true },
        { name: 'imageUrl',         label: 'Image URL',        type: 'url' },
        { name: 'isAlcoholic',      label: 'Alcoholic?',       type: 'checkbox' },
        {
            name: 'mainAlcoholId', label: 'Main Alcohol', type: 'custom',
            render: deps.mainAlcoholSelect,
        },
        {
            name: 'glassId', label: 'Glass', type: 'select',
            options: deps.glassOptions,
            placeholder: 'Select glass',
        },
        {
            name: 'difficulty', label: 'Difficulty', type: 'select', defaultValue: 'easy',
            options: COCKTAIL_DIFFICULTIES.map((v) => ({ label: capitalize(v), value: v })),
        },
        { name: 'preparationTime', label: 'Preparation time (min)', type: 'number', defaultValue: 0 },
        {
            name: 'technique', label: 'Technique', type: 'multiselect',
            options: COCKTAIL_TECHNIQUES.map((v) => ({ label: v, value: v })),
        },
        {
            name: 'flavors', label: 'Flavors', type: 'multiselect',
            options: COCKTAIL_FLAVORS.map((v) => ({ label: v, value: v })),
        },
        {
            name: 'occasions', label: 'Occasions', type: 'multiselect',
            options: COCKTAIL_OCCASIONS.map((v) => ({ label: v, value: v })),
        },
        {
            name: 'barToolIds', label: 'Bar tools', type: 'multiselect',
            options: deps.barToolOptions,
        },
        {
            name: 'ingredients', label: 'Ingredients', type: 'custom', required: true,
        validation: z.array(z.unknown()).min(1, 'At least one ingredient is required'),
            render: deps.ingredientRepeater,
        },
    ]
}
