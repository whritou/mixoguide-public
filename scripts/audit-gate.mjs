#!/usr/bin/env node
// Dependency audit gate for CI.
//
// Fails on any high/critical advisory in production dependencies unless the
// package is listed in audit-allowlist.json with a justification and an expiry
// date. Expired entries fail the build, so accepted risks are re-reviewed.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const BLOCKING = new Set(['high', 'critical'])

let report
try {
    report = JSON.parse(execSync('npm audit --omit=dev --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
} catch (error) {
    // npm audit exits non-zero when vulnerabilities exist; the JSON is still on stdout.
    report = JSON.parse(error.stdout)
}

const allowlist = JSON.parse(readFileSync(new URL('../audit-allowlist.json', import.meta.url), 'utf8'))
const today = new Date().toISOString().slice(0, 10)
const failures = []

for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
    if (!BLOCKING.has(vuln.severity)) continue
    const entry = allowlist[name]
    if (!entry) {
        failures.push(`${vuln.severity.toUpperCase()} ${name} (${vuln.range}) is not allow-listed`)
    } else if (entry.expires < today) {
        failures.push(`${name}: allow-list entry expired on ${entry.expires} — re-review it`)
    } else {
        console.log(`accepted ${vuln.severity} ${name} until ${entry.expires}: ${entry.reason}`)
    }
}

if (failures.length) {
    console.error('Dependency audit gate failed:\n  ' + failures.join('\n  '))
    process.exit(1)
}
console.log('Dependency audit gate passed.')
