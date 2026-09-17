import * as LocalAuthentication from 'expo-local-authentication'

export async function isBiometricAvailable(): Promise<boolean> {
    const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
    ])
    return hasHardware && isEnrolled
}

export async function requireUnlock(): Promise<boolean> {
    if (!(await isBiometricAvailable())) return true
    const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock MixoGuide',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
    })
    return result.success
}
