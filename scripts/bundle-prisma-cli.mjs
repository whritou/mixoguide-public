#!/usr/bin/env node
// Copies the locally installed (lockfile-pinned) Prisma CLI and its full runtime
// dependency closure into <outDir>/node_modules, so the production image can run
// `prisma migrate deploy` without fetching anything from the npm registry.
//
// Usage (Docker builder stage): node scripts/bundle-prisma-cli.mjs /app/prisma-cli
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outDir = path.resolve(process.argv[2] ?? 'prisma-cli')
const seen = new Set()

function findPackageDir(name, fromDir) {
    let dir = fromDir
    for (;;) {
        const candidate = path.join(dir, 'node_modules', name, 'package.json')
        if (fs.existsSync(candidate)) return path.dirname(candidate)
        const parent = path.dirname(dir)
        if (parent === dir) return null
        dir = parent
    }
}

function visit(pkgDir) {
    if (seen.has(pkgDir)) return
    seen.add(pkgDir)
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
    const optional = pkg.optionalDependencies ?? {}
    for (const dep of Object.keys({ ...pkg.dependencies, ...optional })) {
        const depDir = findPackageDir(dep, pkgDir)
        if (depDir) visit(depDir)
        else if (!(dep in optional)) throw new Error(`Missing dependency ${dep} of ${pkg.name}`)
    }
}

const entry = findPackageDir('prisma', root)
if (!entry) throw new Error('prisma is not installed; run npm ci first')
visit(entry)

for (const dir of seen) {
    const rel = path.relative(root, dir)
    fs.cpSync(dir, path.join(outDir, rel), { recursive: true, dereference: true })
}

console.log(`Bundled ${seen.size} packages for the Prisma CLI into ${outDir}`)
