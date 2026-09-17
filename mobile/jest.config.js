/** @type {import('jest').Config} */
module.exports = {
    preset: 'jest-expo',
    rootDir: __dirname,
    roots: [__dirname],
    moduleNameMapper: {
        '^@/(.*)$': `${__dirname}/src/$1`,
        '^@mixoguide/shared$': `${__dirname}/src/shared`,
    },
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry/.*)',
    ],
    collectCoverageFrom: [
        'src/api/endpoints/**/*.ts',
        'src/auth/biometric.ts',
        'src/auth/tokenStore.ts',
        'src/auth/useAuth.ts',
        'src/features/**/hooks.ts',
        '!src/**/*.d.ts',
        '!src/shared/**',
        '!**/__tests__/**',
    ],
    coverageThreshold: {
        global: {
            statements: 85,
            branches: 80,
            functions: 80,
            lines: 85,
        },
    },
}
