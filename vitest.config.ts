import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        globals:     false,
        environment: 'node',
        include: [
            'tests/**/*.test.ts',
            'tests/**/*.test.tsx',
            'tests/**/*.spec.ts',
            'tests/**/*.spec.tsx',
        ],
        setupFiles:  ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
            include:  [
                'src/app/api/auth/login/route.ts',
                'src/app/api/auth/request-reset-password/route.ts',
                'src/app/api/auth/mobile/logout/route.ts',
                'src/app/api/auth/mobile/request-reset/route.ts',
                'src/app/api/auth/mobile/reset-password/route.ts',
                'src/app/api/auth/mobile/oauth/google/start/route.ts',
                'src/app/api/cocktails/recommendations/route.ts',
                'src/app/api/health/route.ts',
                'src/app/api/planned-collections/[id]/grocery/route.ts',
                'src/app/api/planned-collections/[id]/share/route.ts',
                'src/app/api/ratings/route.ts',
                'src/app/api/smart-collections/[slug]/route.ts',
                'src/app/api/suggestions/[id]/route.ts',
                'src/app/api/user-favorites-cocktail/[cocktailId]/route.ts',
                'src/lib/rateLimit.ts',
                'src/middlewares/withAuth.ts',
            ],
            exclude: [
                'src/app/api/**/route.tsx',
            ],
            reporter: ['text', 'lcov'],
            thresholds: {
                statements: 90,
                branches:   85,
                functions:  85,
                lines:      90,
            },
        },
    },
})
