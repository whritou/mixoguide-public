/**
 * Shared style tokens for printable PDFs. The values are tuned to match the
 * MixoGuide web brand (warm cream + caramel + brown) but flattened to the
 * subset @react-pdf/renderer's `StyleSheet.create` understands.
 */
import { StyleSheet } from '@react-pdf/renderer'

export const C = {
    ink:      '#1b1c1a',
    charcoal: '#3a342d',
    muted:    '#81756a',
    brown:    '#7a5830',
    caramel:  '#bc9366',
    cream:    '#fbf9f6',
    bone:     '#e4e2df',
    sand:     '#f0ece8',
    danger:   '#a23a25',
} as const

export const baseStyles = StyleSheet.create({
    page: {
        backgroundColor: C.cream,
        paddingTop:    36,
        paddingBottom: 50,
        paddingHorizontal: 40,
        fontSize: 11,
        color: C.charcoal,
        fontFamily: 'Helvetica',
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: C.bone,
    },
    brandWord: {
        fontFamily: 'Times-Italic',
        fontSize: 18,
        color: C.brown,
    },
    eyebrow: {
        fontSize: 8,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: C.muted,
        fontFamily: 'Helvetica-Bold',
    },
    footer: {
        position: 'absolute',
        bottom: 22,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 8,
        color: C.muted,
        borderTopWidth: 1,
        borderTopColor: C.bone,
        paddingTop: 8,
    },
})
