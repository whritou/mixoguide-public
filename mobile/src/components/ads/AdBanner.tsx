import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Constants from 'expo-constants'
import { getBannerAdUnitId, initializeAds } from '@/lib/ads'
import { FLOATING_TAB_AD_SLOT_HEIGHT } from '@/components/navigation/floatingTabBarMetrics'
import { C } from '@/theme/brand'

type AdBannerProps = {
    onVisibilityChange?: (visible: boolean) => void
}

export function AdBanner({ onVisibilityChange }: AdBannerProps) {
    const isExpoGo = Constants.appOwnership === 'expo'
    const adsModule = useMemo(() => {
        if (isExpoGo) return null
        try {
            return require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads')
        } catch {
            return null
        }
    }, [isExpoGo])
    const unitId = useMemo(() => getBannerAdUnitId(), [])
    const [isReady, setIsReady] = useState(false)
    const [isHidden, setIsHidden] = useState(false)

    useEffect(() => {
        if (!unitId) return

        let mounted = true
        initializeAds().finally(() => {
            if (mounted) setIsReady(true)
        })

        return () => {
            mounted = false
        }
    }, [unitId])

    const BannerAd = adsModule?.BannerAd
    const isVisible = !isExpoGo && !!unitId && !isHidden && !!BannerAd && !!adsModule

    useEffect(() => {
        onVisibilityChange?.(isVisible)
    }, [isVisible, onVisibilityChange])

    if (!isVisible) return null

    return (
        <View style={styles.slot}>
            {isReady ? (
                <BannerAd
                    unitId={unitId}
                    size={adsModule.BannerAdSize.BANNER}
                    requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                    onAdFailedToLoad={() => setIsHidden(true)}
                />
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    slot: {
        minHeight: FLOATING_TAB_AD_SLOT_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.card,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: C.border,
    },
})
