const { spawnSync } = require('node:child_process')
const path = require('node:path')

const checklistPath = path.resolve(__dirname, 'android-smoke-checklist.md')

function run(command, args) {
    return spawnSync(command, args, { stdio: 'pipe', encoding: 'utf8' })
}

function printHeader(title) {
    console.log(`\n=== ${title} ===`)
}

printHeader('MixoGuide Android Smoke')
console.log(`Checklist: ${checklistPath}`)

const adbVersion = run('adb', ['version'])
if (adbVersion.status !== 0) {
    console.log('adb not found on PATH. Install Android platform-tools and retry.')
    process.exit(1)
}

const devices = run('adb', ['devices'])
if (devices.status !== 0) {
    console.log('Unable to query adb devices.')
    console.log(devices.stderr.trim())
    process.exit(1)
}

printHeader('Connected Devices')
console.log(devices.stdout.trim())

console.log('\nManual smoke commands:')
console.log('1) adb shell am start -n com.mixoguide.mobile/.MainActivity')
console.log('2) adb exec-out screencap -p > smoke-home.png')
console.log('3) Follow mobile/scripts/android-smoke-checklist.md')
console.log('4) adb logcat -d -t 300 > smoke-logcat.txt')
