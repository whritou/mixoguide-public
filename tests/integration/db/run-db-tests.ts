import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envPath = path.resolve(process.cwd(), '.env')

if (existsSync(envLocalPath)) {
    loadEnv({ path: envLocalPath })
}
if (existsSync(envPath)) {
    loadEnv({ path: envPath })
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL

if (!testDatabaseUrl) {
    console.error('Missing TEST_DATABASE_URL. Aborting DB integration tests.')
    process.exit(1)
}

const childEnv = Object.fromEntries(
    Object.entries(process.env).filter(
        ([key, value]) => !key.startsWith('=') && typeof value === 'string',
    ),
)

const vitestArgs = [
    'vitest',
    'run',
    'tests/integration/db',
    '--config',
    'vitest.config.ts',
    '--fileParallelism=false',
    '--sequence.concurrent=false',
]

const result = process.platform === 'win32'
    ? spawnSync(
        process.env.ComSpec ?? 'cmd.exe',
        ['/d', '/s', '/c', `npx ${vitestArgs.join(' ')}`],
        {
            stdio: 'inherit',
            env: {
                ...childEnv,
                NODE_ENV: 'test',
                DATABASE_URL: testDatabaseUrl,
                DIRECT_URL: process.env.DIRECT_URL ?? testDatabaseUrl,
            },
        },
    )
    : spawnSync(
        'npx',
        vitestArgs,
        {
            stdio: 'inherit',
            env: {
                ...childEnv,
                NODE_ENV: 'test',
                DATABASE_URL: testDatabaseUrl,
                DIRECT_URL: process.env.DIRECT_URL ?? testDatabaseUrl,
            },
        },
    )

if (result.error) {
    console.error(result.error.message)
    process.exit(1)
}

process.exit(result.status ?? 1)
