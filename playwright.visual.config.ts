import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import base from './playwright.config'

config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH

export default defineConfig({
    testDir: './e2e/visual',
    fullyParallel: true,
    workers: 1,
    reporter: 'line',
    use: base.use,
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                ...(executablePath ? { launchOptions: { executablePath } } : {}),
            },
        },
    ],
    webServer: {
        command: 'npx next dev -p 3000',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        env: { NEXT_PUBLIC_DARK_MODE: 'on' },
        timeout: 180_000,
    },
})
