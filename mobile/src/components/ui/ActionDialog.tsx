import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/theme/brand'

type IconName = ComponentProps<typeof Ionicons>['name']
type ActionTone = 'default' | 'danger' | 'success'

export type ActionDialogOptions = {
    title: string
    message: string
    confirmLabel: string
    cancelLabel?: string
    secondaryLabel?: string
    secondaryTone?: ActionTone
    tone?: ActionTone
    icon?: IconName
    onDismiss?: () => void
    onSecondary?: () => void
    onConfirm: () => void
}

type ActionDialogProps = {
    options: ActionDialogOptions | null
    onClose: () => void
}

function iconForTone(tone: ActionTone): IconName {
    if (tone === 'danger') return 'trash-outline'
    if (tone === 'success') return 'checkmark-circle-outline'
    return 'help-circle-outline'
}

function colorForTone(tone: ActionTone): string {
    if (tone === 'danger') return '#a8472a'
    if (tone === 'success') return '#5a7050'
    return C.bronze
}

function ActionDialog({ options, onClose }: ActionDialogProps) {
    const tone = options?.tone ?? 'default'
    const accent = colorForTone(tone)
    const secondaryAccent = colorForTone(options?.secondaryTone ?? 'default')

    function confirm() {
        if (!options) return
        const onConfirm = options.onConfirm
        onClose()
        onConfirm()
    }

    function secondary() {
        if (!options?.onSecondary) return
        const onSecondary = options.onSecondary
        onClose()
        onSecondary()
    }

    return (
        <Modal transparent visible={!!options} animationType="fade" onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose}>
                <Pressable style={s.card} onPress={() => undefined}>
                    <View style={[s.iconWrap, { backgroundColor: `${accent}1f` }]}>
                        <Ionicons name={options?.icon ?? iconForTone(tone)} size={24} color={accent} />
                    </View>
                    <Text style={s.title}>{options?.title}</Text>
                    <Text style={s.message}>{options?.message}</Text>
                    {options?.secondaryLabel && options.onSecondary ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={options.secondaryLabel}
                            style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}
                            onPress={secondary}
                        >
                            <Text style={[s.secondaryText, { color: secondaryAccent }]}>
                                {options.secondaryLabel}
                            </Text>
                        </Pressable>
                    ) : null}
                    <View style={s.actions}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={options?.cancelLabel ?? 'Cancel'}
                            style={({ pressed }) => [s.cancelBtn, pressed && s.pressed]}
                            onPress={onClose}
                        >
                            <Text style={s.cancelText}>{options?.cancelLabel ?? 'Cancel'}</Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={options?.confirmLabel ?? 'Confirm'}
                            style={({ pressed }) => [
                                s.confirmBtn,
                                { backgroundColor: accent },
                                pressed && s.pressed,
                            ]}
                            onPress={confirm}
                        >
                            <Text style={s.confirmText}>{options?.confirmLabel}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const queuedGlobalDialogs: ActionDialogOptions[] = []
let globalOpenActionDialog: ((options: ActionDialogOptions) => void) | null = null

export function showGlobalActionDialog(options: ActionDialogOptions): void {
    if (!globalOpenActionDialog) {
        queuedGlobalDialogs.push(options)
        return
    }

    globalOpenActionDialog(options)
}

export function showGlobalNoticeDialog(options: {
    title: string
    message: string
    confirmLabel?: string
    tone?: ActionTone
    icon?: IconName
}): void {
    showGlobalActionDialog({
        title:        options.title,
        message:      options.message,
        confirmLabel: options.confirmLabel ?? 'OK',
        tone:         options.tone,
        icon:         options.icon,
        onConfirm:    () => undefined,
    })
}

export function useActionDialog(): {
    openActionDialog: (options: ActionDialogOptions) => void
    actionDialog: ReactNode
} {
    const [options, setOptions] = useState<ActionDialogOptions | null>(null)
    const close = useCallback(() => {
        setOptions((current) => {
            current?.onDismiss?.()
            return null
        })
    }, [])
    const openActionDialog = useCallback((next: ActionDialogOptions) => setOptions(next), [])

    return {
        openActionDialog,
        actionDialog: <ActionDialog options={options} onClose={close} />,
    }
}

export function ActionDialogHost() {
    const { openActionDialog, actionDialog } = useActionDialog()

    useEffect(() => {
        globalOpenActionDialog = openActionDialog
        const pending = queuedGlobalDialogs.splice(0)
        pending.forEach(openActionDialog)

        return () => {
            if (globalOpenActionDialog === openActionDialog) {
                globalOpenActionDialog = null
            }
        }
    }, [openActionDialog])

    return <>{actionDialog}</>
}

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
        backgroundColor: 'rgba(27,28,26,0.34)',
    },
    card: {
        width: '100%',
        maxWidth: 380,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(211,196,183,0.92)',
        borderRadius: 26,
        padding: 20,
        backgroundColor: 'rgba(251,249,246,0.98)',
        shadowColor: C.ink,
        shadowOpacity: 0.2,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 18,
    },
    iconWrap: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 26,
        marginBottom: 14,
    },
    title: {
        fontFamily: F.head,
        fontStyle: 'italic',
        fontSize: 22,
        lineHeight: 26,
        color: C.ink,
        textAlign: 'center',
    },
    message: {
        marginTop: 8,
        color: C.mute,
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
    },
    actions: {
        width: '100%',
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    secondaryBtn: {
        minHeight: 34,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        paddingHorizontal: 12,
    },
    secondaryText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.3,
        textTransform: 'uppercase',
    },
    cancelBtn: {
        flex: 1,
        minHeight: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.borderWarm,
        borderRadius: 16,
        backgroundColor: C.card,
    },
    confirmBtn: {
        flex: 1,
        minHeight: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    },
    cancelText: {
        color: C.mute,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.3,
        textTransform: 'uppercase',
    },
    confirmText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.3,
        textTransform: 'uppercase',
    },
    pressed: {
        opacity: 0.72,
    },
})
