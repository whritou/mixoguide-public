import { z } from 'zod'

export const demoBarSchema = z.array(z.string().min(1).max(64)).max(40)

export const importDemoBarSchema = z.object({ ingredientIds: demoBarSchema })
