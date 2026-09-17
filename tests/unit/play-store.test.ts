import { describe, expect, it } from 'vitest'

import { isAndroidMobileUserAgent } from '@/lib/play-store'

describe('play store web helpers', () => {
    it('detects Android mobile browsers', () => {
        expect(isAndroidMobileUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125 Mobile Safari/537.36')).toBe(true)
    })

    it('does not show Android Play Store prompt on desktop or iOS', () => {
        expect(isAndroidMobileUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36')).toBe(false)
        expect(isAndroidMobileUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1')).toBe(false)
    })
})
