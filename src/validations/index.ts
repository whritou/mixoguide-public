// src/validations/cocktail.validation.ts

import { z } from 'zod'
import { LIMITS } from '@/constants/validation-limits'

export const measureUnit = z.enum(['cl', 'ml', 'oz', 'g', 'pcs', 'zest', 'slice', 'twist'])
const plannedCollectionOccasion = z.enum(['party', 'romantic', 'casual', 'formal', 'holiday', 'summer', 'winter', 'spring', 'fall', 'celebration'])

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

export type CreateCocktailInput = z.infer<typeof createCocktailSchema>
export type UpdateCocktailInput = z.infer<typeof updateCocktailSchema>

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/ingredient.validation.ts

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

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/user.validation.ts

export const createUserSchema = z.object({
  name: z.string().min(1).max(LIMITS.NAME_SHORT).optional().nullable(),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  image: z.string().url().optional().nullable(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
})

export const updateUserSchema = createUserSchema.partial()

export const updateProfileSchema = z.object({
    name: z.string().min(2).max(LIMITS.NAME_SHORT).trim().optional(),
    image: z.string().url().nullable().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/rating.validation.ts

export const upsertRatingSchema = z.object({
    rating: z.number().int().min(0).max(5),
})

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/pantry.validation.ts
export const upsertPantryItemSchema = z.object({
    quantity: z.number().min(0).optional(),
    unitLeft: measureUnit,
    favorite: z.boolean().optional(),
    expirationDate: z.string().datetime().optional().nullable(),
    isEssential: z.boolean().optional(),
    isInfinite: z.boolean().optional(),
    isInPantry: z.boolean().optional(),
    isInShoppingList: z.boolean().optional(),
    shoppingQuantity: z.number().min(0).optional(),
    note: z.string().max(LIMITS.DESCRIPTION_SHORT).optional().nullable(),
})

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/planned-cocktail.validation.ts

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

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/glass.validation.ts

export const createGlassSchema = z.object({
  name: z.string().min(1).max(LIMITS.NAME_SHORT),
  description: z.string().max(LIMITS.DESCRIPTION_MEDIUM).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
})

export const updateGlassSchema = createGlassSchema.partial()

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/bar-tool.validation.ts

export const createBarToolSchema = z.object({
  name: z.string().min(1).max(LIMITS.NAME_SHORT),
  description: z.string().max(LIMITS.DESCRIPTION_MEDIUM).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  type: z.enum(['bar', 'kitchen', 'glassware', 'other']).default('other'),
  isEssential: z.boolean().optional().nullable(),
})

export const updateBarToolSchema = createBarToolSchema.partial()

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/planned-collections.validation.ts

export const createPlannedCollectionSchema = z.object({
    title:       z.string().min(1).max(LIMITS.NAME_MEDIUM),
    location:    z.string().trim().max(LIMITS.LOCATION).optional().nullable(),
    guestNote:   z.string().trim().max(LIMITS.GUEST_NOTE).optional().nullable(),
    plannedFor:  z.string().datetime(),
    servings:    z.number().int().min(1).max(LIMITS.SERVINGS).default(1),
    occasions:   z.array(z.string()).default([]),
    cocktailIds: z.array(z.string().cuid()).default([]),
})

export const updatePlannedCollectionSchema = z.object({
    title: z.string().min(1).max(LIMITS.NAME_MEDIUM).optional(),
    location: z.string().trim().max(LIMITS.LOCATION).optional().nullable(),
    guestNote: z.string().trim().max(LIMITS.GUEST_NOTE).optional().nullable(),
    plannedFor: z.string().datetime().optional(),
    servings: z.number().int().min(1).max(LIMITS.SERVINGS).optional(),
    occasions: z.array(plannedCollectionOccasion).optional(),
    status: z.enum(['planned', 'done']).optional(),
})

export const plannedCollectionCocktailSchema = z.object({
    cocktailId: z.string().cuid(),
})

export const addIngredientsBulkSchema = z.object({
    items: z.array(z.object({
        ingredientId: z.string().cuid(),
        destination: z.enum(['pantry', 'shopping']).default('pantry'),
        quantity: z.number().positive().max(LIMITS.BULK_ITEM_QTY),
        unit: measureUnit,
        shoppingQuantity: z.number().min(0).max(LIMITS.BULK_ITEM_QTY).optional().default(0),
    })).min(1).max(LIMITS.BULK_ITEMS),
})

export type AddIngredientsBulkInput = z.infer<typeof addIngredientsBulkSchema>

export const restockPantryItemsSchema = z.object({
    items: z.array(z.object({
        ingredientId: z.string().cuid(),
        quantity: z.number().positive().max(LIMITS.BULK_ITEM_QTY),
        unit: measureUnit,
    })).min(1).max(LIMITS.BULK_ITEMS),
})

export type RestockPantryItemsInput = z.infer<typeof restockPantryItemsSchema>


// ─────────────────────────────────────────────────────────────────────────────
// src/validations/ingredient-type.validation.ts

export const createIngredientTypeSchema = z.object({
  name: z.string().min(1).max(LIMITS.NAME_SHORT),
})
export const updateIngredientTypeSchema = createIngredientTypeSchema.partial()

export const createIngredientSubTypeSchema = z.object({
  name: z.string().min(1).max(LIMITS.NAME_SHORT),
  typeId: z.string().cuid(),
})
export const updateIngredientSubTypeSchema = createIngredientSubTypeSchema.partial()

export const syncCocktailIngredientsSchema = z.object({
    ingredients: z.array(cocktailIngredientSchema),
})

// Reusable for bar-tools sync
export const syncIdsSchema = z.object({
    ids: z.array(z.string().cuid()),
})

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/suggestion.validation.ts

export const createSuggestionSchema = z.object({
    type: z.enum(['NEW_COCKTAIL', 'NEW_INGREDIENT', 'MODIFY_COCKTAIL', 'MODIFY_INGREDIENT']),
    title: z.string().min(1).max(LIMITS.NAME_MEDIUM),
    content: z.string().min(10).max(LIMITS.SUGGESTION_CONTENT),
    targetId: z.string().cuid().optional().nullable(),
    targetName: z.string().max(LIMITS.NAME_MEDIUM).optional().nullable(),
})

export const updateSuggestionSchema = z.object({
    status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED']),
    adminNote: z.string().max(LIMITS.ADMIN_NOTE).optional().nullable(),
})

export type CreateSuggestionInput = z.infer<typeof createSuggestionSchema>
export type UpdateSuggestionInput = z.infer<typeof updateSuggestionSchema>

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/device.validation.ts

export const registerDeviceSchema = z.object({
    platform: z.enum(['android', 'ios']),
    fcmToken: z.string().min(1),
    expoToken: z.string().optional(),
    appVersion: z.string().optional(),
})

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>

// ─────────────────────────────────────────────────────────────────────────────
// src/validations/collection-rsvp.validation.ts

export const createRsvpSchema = z.object({
    name:       z.string().min(1).max(LIMITS.NAME_SHORT).trim(),
    status:     z.enum(['going', 'maybe', 'not_going']),
    guestCount: z.number().int().min(1).max(LIMITS.RSVP_GUESTS).default(1),
    note:       z.string().max(LIMITS.DESCRIPTION_SHORT).optional().nullable(),
    email:      z.string().email().max(LIMITS.EMAIL).optional().nullable(),
    userId:     z.string().cuid().optional().nullable(),
})

export type CreateRsvpInput = z.infer<typeof createRsvpSchema>
