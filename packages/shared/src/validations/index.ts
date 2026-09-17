import { z } from 'zod'
import { LIMITS } from '../constants/validation-limits'

export const measureUnit = z.enum(['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist'])

export const cocktailIngredientSchema = z.object({
    ingredientId: z.string().cuid(),
    amount: z.number().positive().optional(),
    unit: measureUnit,
    optional: z.boolean().default(false),
    substitutes: z.array(z.string().cuid()).default([]),
    subUnit: z.array(measureUnit).default([]),
    subAmount: z.array(z.number().positive()).default([]),
    subShow: z.array(z.boolean()).default([]),
})

export const createCocktailSchema = z.object({
    name: z.string().min(1).max(LIMITS.NAME_MEDIUM),
    description: z.string().max(LIMITS.DESCRIPTION_MEDIUM).optional().nullable(),
    fullDescription: z.string().max(LIMITS.DESCRIPTION_FULL).optional().nullable(),
    instructions: z.array(z.string().max(LIMITS.INSTRUCTION_STEP)).max(LIMITS.INSTRUCTION_COUNT).optional().default([]),
    imageUrl: z.string().url().optional().nullable(),
    isAlcoholic: z.boolean().optional().nullable(),
    mainAlcoholId: z.string().cuid().optional().nullable(),
    source: z.enum(['custom', 'cocktaildb', 'ninjas']).default('custom'),
    externalId: z.string().optional().nullable(),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
    preparationTime: z.number().int().positive().optional().nullable(),
    technique: z.array(z.enum(['shaken', 'stirred', 'built', 'layered', 'blended', 'flamed', 'infused', 'clarified', 'muddled', 'smoked'])).optional(),
    flavors: z.array(z.string()).optional(),
    occasions: z.array(z.string()).optional(),
    origin: z.string().optional().nullable(),
    glassId: z.string().cuid().optional().nullable(),
    ingredients: z.array(cocktailIngredientSchema).optional(),
    barToolIds: z.array(z.string().cuid()).optional(),
})

export const updateCocktailSchema = createCocktailSchema.partial()

export const createIngredientSchema = z.object({
    name: z.string().min(1).max(LIMITS.NAME_MEDIUM),
    typeId: z.string().cuid(),
    subTypeId: z.string().cuid().optional().nullable(),
    description: z.string().max(LIMITS.DESCRIPTION_LONG).optional().nullable(),
    quantity: z.number().positive().optional().nullable(),
    unit: measureUnit,
    isAlcoholic: z.boolean().optional().nullable(),
    abv: z.number().min(0).max(LIMITS.ABV_MAX).optional().nullable(),
    brand: z.string().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
})

export const updateIngredientSchema = createIngredientSchema.partial()

export const upsertRatingSchema = z.object({
    rating: z.number().int().min(0).max(5),
})

export const upsertPantryItemSchema = z.object({
    quantity: z.number().min(0).optional(),
    unitLeft: measureUnit,
    favorite: z.boolean().optional(),
    expirationDate: z.string().datetime().optional().nullable(),
    isEssential: z.boolean().optional(),
    isInPantry: z.boolean().optional(),
    isInShoppingList: z.boolean().optional(),
    shoppingQuantity: z.number().min(0).optional(),
    note: z.string().max(LIMITS.DESCRIPTION_SHORT).optional().nullable(),
})

export const createPlannedCocktailSchema = z.object({
    cocktailId: z.string().cuid(),
    plannedFor: z.string().datetime(),
    quantity: z.number().int().min(1).max(LIMITS.PLANNED_QUANTITY).default(1),
    status: z.enum(['planned', 'done']).default('planned'),
})

export const makeCocktailNowSchema = z.object({
    quantity: z.number().int().min(1).max(LIMITS.PLANNED_QUANTITY).default(1),
})

export const updatePlannedCocktailSchema = createPlannedCocktailSchema.partial()

export const createPlannedCollectionSchema = z.object({
    title: z.string().min(1).max(LIMITS.NAME_MEDIUM),
    plannedFor: z.string().datetime(),
    servings: z.number().int().min(1).max(LIMITS.SERVINGS).default(1),
    occasions: z.array(z.string()).default([]),
    cocktailIds: z.array(z.string().cuid()).default([]),
})

export const updatePlannedCollectionSchema = z.object({
    title: z.string().min(1).max(LIMITS.NAME_MEDIUM).optional(),
    plannedFor: z.string().datetime().optional(),
    servings: z.number().int().min(1).max(LIMITS.SERVINGS).optional(),
    occasions: z.array(z.string()).optional(),
    status: z.enum(['planned', 'done']).optional(),
})

export const createSuggestionSchema = z.object({
    type: z.enum(['NEW_COCKTAIL', 'NEW_INGREDIENT', 'MODIFY_COCKTAIL', 'MODIFY_INGREDIENT']),
    title: z.string().min(1).max(LIMITS.NAME_MEDIUM),
    content: z.string().min(10).max(LIMITS.SUGGESTION_CONTENT),
    targetId: z.string().cuid().optional().nullable(),
    targetName: z.string().max(LIMITS.NAME_MEDIUM).optional().nullable(),
})

export const updateProfileSchema = z.object({
    name: z.string().min(2).max(LIMITS.NAME_SHORT).trim().optional(),
    image: z.string().url().nullable().optional(),
})

export const registerDeviceSchema = z.object({
    platform: z.enum(['android', 'ios']),
    fcmToken: z.string().min(1),
    expoToken: z.string().optional(),
    appVersion: z.string().optional(),
})

export type CreateCocktailInput = z.infer<typeof createCocktailSchema>
export type UpdateCocktailInput = z.infer<typeof updateCocktailSchema>
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>
export type UpsertPantryItemInput = z.infer<typeof upsertPantryItemSchema>
export type CreatePlannedCocktailInput = z.infer<typeof createPlannedCocktailSchema>
export type UpdatePlannedCocktailInput = z.infer<typeof updatePlannedCocktailSchema>
export type CreatePlannedCollectionInput = z.infer<typeof createPlannedCollectionSchema>
export type UpdatePlannedCollectionInput = z.infer<typeof updatePlannedCollectionSchema>
export type CreateSuggestionInput = z.infer<typeof createSuggestionSchema>
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>
