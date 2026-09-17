import { useRef, useState } from 'react'
import {
    View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C, F } from '@/theme/brand'

interface Props {
    visible: boolean
    onClose: () => void
    onScanned: (barcode: string) => void
    /** When true, the camera is paused (e.g. while we resolve the lookup). */
    busy?: boolean
    busyLabel?: string
}

const BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e']

export function BarcodeScannerSheet({ visible, onClose, onScanned, busy, busyLabel }: Props) {
    const insets = useSafeAreaInsets()
    const [permission, requestPermission] = useCameraPermissions()
    const lastScanRef = useRef<{ code: string; at: number } | null>(null)
    const [torch, setTorch] = useState(false)

    if (!visible) return null

    const handleBarcode = (result: BarcodeScanningResult) => {
        if (busy) return
        const code = result.data
        const now  = Date.now()
        const last = lastScanRef.current
        if (last && last.code === code && now - last.at < 1200) return
        lastScanRef.current = { code, at: now }
        onScanned(code)
    }

    const renderContent = () => {
        if (!permission) {
            return (
                <View style={s.placeholder}>
                    <ActivityIndicator color="#f5ece0" />
                </View>
            )
        }
        if (!permission.granted) {
            return (
                <View style={s.permissionWrap}>
                    <Ionicons name="camera-outline" size={42} color="#f5ece0" />
                    <Text style={s.permissionTitle}>Camera access needed</Text>
                    <Text style={s.permissionSub}>
                        Allow camera access to scan barcodes when adding ingredients to your pantry.
                    </Text>
                    {permission.canAskAgain ? (
                        <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
                            <Text style={s.permissionBtnText}>Allow camera</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={s.permissionBtn} onPress={() => Linking.openSettings()}>
                            <Text style={s.permissionBtnText}>Open settings</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )
        }
        return (
            <>
                <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    enableTorch={torch}
                    barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
                    onBarcodeScanned={busy ? undefined : handleBarcode}
                />
                <View style={s.overlay} pointerEvents="none">
                    <View style={s.reticle}>
                        <View style={[s.corner, s.cornerTL]} />
                        <View style={[s.corner, s.cornerTR]} />
                        <View style={[s.corner, s.cornerBL]} />
                        <View style={[s.corner, s.cornerBR]} />
                    </View>
                </View>
                {busy && (
                    <View style={s.busyWrap}>
                        <ActivityIndicator color="#f5ece0" />
                        <Text style={s.busyText}>{busyLabel ?? 'Looking up…'}</Text>
                    </View>
                )}
            </>
        )
    }

    return (
        <View style={s.root}>
            {renderContent()}

            <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity style={s.iconBtn} onPress={onClose} hitSlop={8}>
                    <Ionicons name="close" size={22} color="#f5ece0" />
                </TouchableOpacity>
                <Text style={s.title}>Scan barcode</Text>
                <TouchableOpacity
                    style={[s.iconBtn, torch && s.iconBtnOn]}
                    onPress={() => setTorch(t => !t)}
                    hitSlop={8}
                    disabled={!permission?.granted}
                >
                    <Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color="#f5ece0" />
                </TouchableOpacity>
            </View>

            <View style={[s.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
                <Text style={s.bottomHint}>
                    Point your camera at the product barcode.
                </Text>
            </View>
        </View>
    )
}

const RETICLE = 260

const s = StyleSheet.create({
    root: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#000', zIndex: 1000,
    },
    placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

    permissionWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
        padding: 32, gap: 12,
    },
    permissionTitle: { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: '#f5ece0' },
    permissionSub:   { fontSize: 13, color: 'rgba(245,236,224,0.75)', textAlign: 'center' },
    permissionBtn:   { marginTop: 12, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, backgroundColor: C.bronze },
    permissionBtnText: { fontFamily: F.mono, fontSize: 12, fontWeight: '600', color: '#f5ece0', letterSpacing: 1, textTransform: 'uppercase' },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
    },
    reticle: {
        width: RETICLE, height: RETICLE * 0.62, position: 'relative',
    },
    corner: {
        position: 'absolute', width: 28, height: 28,
        borderColor: '#f5ece0', borderWidth: 3, borderRadius: 4,
    },
    cornerTL: { top: 0,    left: 0,    borderRightWidth: 0, borderBottomWidth: 0 },
    cornerTR: { top: 0,    right: 0,   borderLeftWidth: 0,  borderBottomWidth: 0 },
    cornerBL: { bottom: 0, left: 0,    borderRightWidth: 0, borderTopWidth: 0 },
    cornerBR: { bottom: 0, right: 0,   borderLeftWidth: 0,  borderTopWidth: 0 },

    busyWrap: {
        position: 'absolute', bottom: '32%', alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 10, paddingHorizontal: 18,
        borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)',
    },
    busyText: { color: '#f5ece0', fontFamily: F.mono, fontSize: 12, letterSpacing: 0.4 },

    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: 16, paddingBottom: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    iconBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    iconBtnOn: { backgroundColor: C.bronze },
    title: { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, color: '#f5ece0' },

    bottomBar: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingHorizontal: 24, paddingTop: 16,
        alignItems: 'center',
    },
    bottomHint: { color: 'rgba(245,236,224,0.85)', fontSize: 13, textAlign: 'center' },
})
