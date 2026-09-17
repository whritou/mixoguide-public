const path = require('path')
const {
    getSentryExpoConfig
} = require("@sentry/react-native/metro");

const projectRoot = __dirname

const config = getSentryExpoConfig(projectRoot)

config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
    '@mixoguide/shared': path.resolve(projectRoot, 'src/shared'),
}

module.exports = config