jest.mock('expo-local-authentication', () => ({
    hasHardwareAsync: jest.fn(),
    isEnrolledAsync: jest.fn(),
    authenticateAsync: jest.fn(),
}))

import * as LocalAuthentication from 'expo-local-authentication'
import { isBiometricAvailable, requireUnlock } from '../biometric'

describe('biometric auth helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('reports biometric availability only when hardware is present and enrolled', async () => {
        ;(LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValueOnce(true)
        ;(LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValueOnce(true)
        await expect(isBiometricAvailable()).resolves.toBe(true)

        ;(LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValueOnce(true)
        ;(LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValueOnce(false)
        await expect(isBiometricAvailable()).resolves.toBe(false)
    })

    it('bypasses prompt when biometrics are unavailable', async () => {
        ;(LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValueOnce(false)
        ;(LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValueOnce(false)

        await expect(requireUnlock()).resolves.toBe(true)
        expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled()
    })

    it('returns authenticator result when biometric prompt is shown', async () => {
        ;(LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true)
        ;(LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true)
        ;(LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({ success: true })
        await expect(requireUnlock()).resolves.toBe(true)

        ;(LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({ success: false })
        await expect(requireUnlock()).resolves.toBe(false)
    })
})
