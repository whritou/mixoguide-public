import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import OnboardScreen from '../onboard'
import { markOnboardingComplete } from '@/auth/tokenStore'
import { router } from 'expo-router'

jest.mock('expo-router', () => ({
    router: {
        push: jest.fn(),
    },
}))

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

jest.mock('@expo/vector-icons', () => ({
    Ionicons: () => null,
}))

jest.mock('@/auth/tokenStore', () => ({
    markOnboardingComplete: jest.fn(() => Promise.resolve()),
}))

describe('logged-out onboarding stepper', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders four stepper screens with next and previous navigation', () => {
        const screen = render(<OnboardScreen />)

        expect(screen.getByText('1/4')).toBeTruthy()
        expect(screen.getByText('Cocktails that know your bar')).toBeTruthy()

        fireEvent.press(screen.getByText('Next'))
        expect(screen.getByText('2/4')).toBeTruthy()
        expect(screen.getByText('Pantry without guesswork')).toBeTruthy()

        fireEvent.press(screen.getByText('Previous'))
        expect(screen.getByText('1/4')).toBeTruthy()
    })

    it('marks onboarding complete only when account navigation is chosen', async () => {
        const screen = render(<OnboardScreen />)

        fireEvent.press(screen.getByText('Next'))
        fireEvent.press(screen.getByText('Next'))
        fireEvent.press(screen.getByText('Next'))

        expect(markOnboardingComplete).not.toHaveBeenCalled()

        fireEvent.press(screen.getByText('Create account'))

        await waitFor(() => {
            expect(markOnboardingComplete).toHaveBeenCalledTimes(1)
            expect(router.push).toHaveBeenCalledWith('/(auth)/register')
        })
    })
})
