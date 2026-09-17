import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
test.describe.configure({ mode: 'serial' })

test.describe('Sign In page', () => {
    test.setTimeout(60_000)

    test('shows heading and subtitle', async ({ page }) => {
        await page.goto('/signin')
        await page.waitForLoadState('domcontentloaded')

        await expect(page.getByRole('heading', { name: 'Welcome back', level: 1 })).toBeVisible()
        await expect(page.getByText('Sign in to your account to continue mixing.')).toBeVisible()
    })

    test('shows email and password inputs', async ({ page }) => {
        await page.goto('/signin')
        await page.waitForLoadState('domcontentloaded')

        await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
        await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
    })

    test('shows Google OAuth button', async ({ page }) => {
        await page.goto('/signin')
        await page.waitForLoadState('domcontentloaded')

        await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
    })

    test('shows Sign in button', async ({ page }) => {
        await page.goto('/signin')
        await page.waitForLoadState('domcontentloaded')

        await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    })

    test('Forgot password link navigates to /request-reset-password', async ({ page }) => {
        await page.goto('/signin')
        await page.waitForLoadState('domcontentloaded')

        await page.getByRole('link', { name: 'Forgot password?' }).click()
        await page.waitForURL('/request-reset-password', { timeout: 8_000 })
    })

    test('Sign up link navigates to /signup', async ({ page }) => {
        await page.goto('/signin')
        await page.waitForLoadState('domcontentloaded')

        const signUpLink = page.getByRole('link', { name: 'Sign up', exact: true }).last()
        await expect(signUpLink).toHaveAttribute('href', /\/signup/)

        await Promise.all([
            page.waitForURL(/\/signup/, { timeout: 8_000 }),
            signUpLink.click(),
        ])
    })

    test('shows error when submitting invalid credentials', async ({ page }) => {
        await page.goto('/signin')
        await page.waitForLoadState('domcontentloaded')

        await page.getByPlaceholder('you@example.com').fill('invalid@test.com')
        await page.getByPlaceholder('Enter your password').fill('wrongpassword')

        const signInButton = page.getByRole('button', { name: 'Sign in' })

        // In environments with a real Turnstile challenge, submit stays disabled.
        // In test-key environments, it becomes enabled and we can assert credential errors.
        if (await signInButton.isDisabled()) {
            await expect(signInButton).toBeDisabled()
            await expect(page.getByText('Forgot password?')).toBeVisible()
            return
        }

        await signInButton.click()
        await expect(page.getByText('Invalid email or password.')).toBeVisible({ timeout: 8_000 })
    })

    test('callbackUrl param is preserved in Sign up link', async ({ page }) => {
        await page.goto('/signin?callbackUrl=%2Fcocktails')
        await page.waitForLoadState('domcontentloaded')

        const signUpLink = page.getByRole('link', { name: 'Sign up' })
        const href = await signUpLink.getAttribute('href')
        expect(href).toContain('callbackUrl')
    })
})

test.describe('Sign Up page', () => {
    test.setTimeout(60_000)

    test('shows heading and subtitle', async ({ page }) => {
        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')

        await expect(page.getByRole('heading', { name: 'Create your account', level: 1 })).toBeVisible()
        await expect(page.getByText(/Join Mixoguide/i)).toBeVisible()
    })

    test('shows all form inputs', async ({ page }) => {
        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')

        await expect(page.getByPlaceholder('Your name')).toBeVisible()
        await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
        await expect(page.getByPlaceholder('Create a password')).toBeVisible()
        await expect(page.getByPlaceholder('Confirm your password')).toBeVisible()
    })

    test('shows Create account button', async ({ page }) => {
        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')

        await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible()
    })

    test('shows Google OAuth button', async ({ page }) => {
        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')

        await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
    })

    test('Sign in link navigates to /signin', async ({ page }) => {
        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')

        await page.getByRole('link', { name: 'Sign in' }).click()
        await expect(page).toHaveURL(/\/signin/)
    })

    test('Terms of Use link has correct href', async ({ page }) => {
        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')

        const href = await page.getByRole('link', { name: 'Terms of Use' }).getAttribute('href')
        expect(href).toContain('terms-of-use')
    })
})

test.describe('Forgot Password page', () => {
    test.setTimeout(60_000)

    test('shows heading, email input and submit button', async ({ page }) => {
        await page.goto('/request-reset-password')
        await page.waitForLoadState('domcontentloaded')

        await expect(page.getByRole('heading', { name: 'Forgot password?', level: 1 })).toBeVisible()
        await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
    })

    test('Back to sign in link navigates to /signin', async ({ page }) => {
        await page.goto('/request-reset-password')
        await page.waitForLoadState('domcontentloaded')

        await page.getByRole('link', { name: /Back to sign in/i }).click()
        await expect(page).toHaveURL(/\/signin/)
    })
})
