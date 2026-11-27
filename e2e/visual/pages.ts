import { readFileSync } from 'node:fs'
import path from 'node:path'

const publicFixture = JSON.parse(
    readFileSync(path.join(__dirname, 'fixtures', 'public.json'), 'utf8'),
) as { detailId: string }

export type VisualPage = { name: string; path: string; auth: boolean }

export const VISUAL_PAGES: VisualPage[] = [
    { name: 'home-logged-out', path: '/', auth: false },
    { name: 'cocktails', path: '/cocktails', auth: false },
    { name: 'cocktail-detail', path: `/cocktails/${publicFixture.detailId}`, auth: false },
    { name: 'ingredients', path: '/ingredients', auth: false },
    { name: 'signin', path: '/signin', auth: false },
    { name: 'home-logged-in', path: '/', auth: true },
    { name: 'pantry', path: '/pantry', auth: true },
    { name: 'planner', path: '/planner', auth: true },
    { name: 'stats', path: '/stats', auth: true },
    { name: 'admin-cocktails', path: '/admin/cocktails', auth: true },
]

export const VISUAL_USER = {
    id: 'e2e-user-1',
    email: 'fixture.user@mixoguide.test',
    name: 'Fixture User',
    role: 'USER' as const,
}

export const VISUAL_ADMIN = {
    id: 'e2e-admin-1',
    email: 'fixture.admin@mixoguide.test',
    name: 'Fixture Admin',
    role: 'ADMIN' as const,
}

export const FIXED_NOW = new Date('2026-05-26T10:00:00.000Z')
