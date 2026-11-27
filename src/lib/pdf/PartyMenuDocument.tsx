import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const COLORS = {
    page:    '#120d0e',
    gold:    '#d6b26e',
    goldDim: '#6b5a3b',
    title:   '#f2e6d6',
    muted:   '#b5a397',
} as const

const styles = StyleSheet.create({
    page: {
        backgroundColor: COLORS.page,
        paddingTop: 72,
        paddingBottom: 72,
        paddingHorizontal: 64,
        alignItems: 'center',
    },
    date: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        letterSpacing: 3.5,
        textTransform: 'uppercase',
        color: COLORS.gold,
        textAlign: 'center',
    },
    title: {
        fontFamily: 'Times-Italic',
        fontSize: 40,
        color: COLORS.title,
        textAlign: 'center',
        marginTop: 14,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 180,
        marginTop: 22,
        marginBottom: 18,
    },
    rule: { flex: 1, height: 0.75, backgroundColor: COLORS.goldDim },
    diamond: { width: 5, height: 5, marginHorizontal: 10, backgroundColor: COLORS.gold, transform: 'rotate(45deg)' },
    cocktail: { alignItems: 'center', marginTop: 22 },
    name: { fontFamily: 'Times-Roman', fontSize: 20, color: COLORS.title, textAlign: 'center' },
    ingredients: {
        fontFamily: 'Helvetica',
        fontSize: 11,
        lineHeight: 1.5,
        color: COLORS.muted,
        textAlign: 'center',
        marginTop: 5,
        maxWidth: 360,
    },
})

interface Props {
    title:      string
    plannedFor: Date | null
    cocktails:  { name: string; ingredients: string[] }[]
}

function formatDateLine(date: Date): string {
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

export function PartyMenuDocument({ title, plannedFor, cocktails }: Props) {
    return (
        <Document title={`${title} — menu`}>
            <Page size="A4" style={styles.page}>
                {plannedFor && <Text style={styles.date}>{formatDateLine(plannedFor)}</Text>}
                <Text style={styles.title}>{title}</Text>
                <View style={styles.divider}>
                    <View style={styles.rule} />
                    <View style={styles.diamond} />
                    <View style={styles.rule} />
                </View>
                {cocktails.map(cocktail => (
                    <View key={cocktail.name} style={styles.cocktail} wrap={false}>
                        <Text style={styles.name}>{cocktail.name}</Text>
                        <Text style={styles.ingredients}>{cocktail.ingredients.join(', ')}</Text>
                    </View>
                ))}
            </Page>
        </Document>
    )
}
