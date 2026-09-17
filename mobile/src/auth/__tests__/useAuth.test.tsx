import React from 'react'
import { render } from '@testing-library/react-native'
import { AuthContext } from '../AuthProvider'
import { useAuth } from '../useAuth'

function HookProbe() {
    useAuth()
    return null
}

describe('useAuth', () => {
    it('throws when used outside AuthProvider', () => {
        expect(() => render(<HookProbe />)).toThrow('useAuth must be used inside AuthProvider')
    })

    it('returns context value when provider exists', () => {
        const value = {
            user: { id: 'u1', email: 'u@test.dev', name: 'User', image: null, role: 'USER' },
            isLoading: false,
            signIn: jest.fn(async () => undefined),
            signInWithGoogle: jest.fn(async () => undefined),
            signOut: jest.fn(async () => undefined),
        }

        expect(() =>
            render(
                <AuthContext.Provider value={value}>
                    <HookProbe />
                </AuthContext.Provider>,
            ),
        ).not.toThrow()
    })
})
