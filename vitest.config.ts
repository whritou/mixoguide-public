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
            // Measure the whole app (TEST-001), not a hand-picked list.
            include:  ['src/**/*.{ts,tsx}'],
            exclude:  [
                '**/*.d.ts',
                // shadcn/Radix primitives: vendored UI, covered by e2e/a11y scans.
                'src/components/ui/**',
                // Next.js page/layout/loading/error shells and OG images are exercised
                // by Playwright, not unit tests.
                'src/app/**/{page,layout,loading,error,global-error,not-found,template,default}.tsx',
                'src/app/**/opengraph-image.tsx',
                'src/app/**/twitter-image.tsx',
                // Pure type declarations.
                'src/types/**',
            ],
            reporter: ['text-summary', 'text', 'lcov', 'json-summary'],
            // Global gate set just below the measured baseline so it passes today.
            // Ratchet plan (see README "Testing"): raise each value to the new
            // floor(measured) whenever coverage improves; never lower it. Target:
            // 60% lines/statements by the end of BL-10, 80% for src/lib, src/middlewares,
            // src/services and src/repositories (add per-glob thresholds then).
            // Baseline measured 2026-11-27: statements/lines 19.84%, branches 67.47%,
            // functions 41.99%.
            thresholds: {
                statements: 19,
                branches:   65,
                functions:  40,
                lines:      19,
            },
        },
    },
})
