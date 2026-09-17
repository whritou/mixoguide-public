import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { GroceryItem } from '@/utils/groceryCalculator'
import { baseStyles, C } from './styles'

const styles = StyleSheet.create({
    ...baseStyles,
    title: {
        fontFamily: 'Times-Italic',
        fontSize: 26,
        color: C.ink,
        marginTop: 4,
    },
    meta: {
        fontSize: 10,
        color: C.muted,
        marginTop: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
        flexWrap: 'wrap',
    },
    pill: {
        backgroundColor: C.sand,
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
        fontSize: 9,
        color: C.brown,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginRight: 6,
    },
    pillDanger: { color: C.danger, backgroundColor: '#fbe6df' },
    sectionHeader: {
        fontSize: 9,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: C.brown,
        fontFamily: 'Helvetica-Bold',
        marginTop: 20,
        marginBottom: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: C.bone,
    },
    th: {
        fontSize: 9,
        color: C.muted,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: C.bone,
    },
    checkbox: {
        width: 12, height: 12,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: C.muted,
        marginRight: 12,
    },
    name:    { flex: 1, fontSize: 11, color: C.charcoal },
    qty:     { width: 70, fontSize: 11, color: C.brown, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
    status:  { width: 80, fontSize: 9, color: C.muted, textAlign: 'right' },
    statusMissing: { color: C.danger, fontFamily: 'Helvetica-Bold' },
    statusPartial: { color: '#a86a1c' },
    statusStocked: { color: C.brown },
})

function formatUnit(n: number, unit: string): string {
    const rounded = Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
    return `${rounded} ${unit}`
}

interface Props {
    collectionTitle: string
    plannedFor:      Date
    location?:       string | null
    items:           GroceryItem[]
    siteUrl:         string
}

export function GroceryListDocument({ collectionTitle, plannedFor, location, items, siteUrl }: Props) {
    const missing = items.filter(i => i.missing > 0 && !i.inWishlist)
    const inList  = items.filter(i => i.inWishlist)
    const stocked = items.filter(i => i.missing === 0)

    const formattedDate = plannedFor.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })

    const totalMissingCount = missing.length
    const totalStockedCount = stocked.length

    return (
        <Document title={`Shopping list — ${collectionTitle}`}>
            <Page size="A4" style={styles.page}>
                {/* Brand header */}
                <View style={styles.brand}>
                    <Text style={styles.brandWord}>MixoGuide</Text>
                    <Text style={styles.eyebrow}>Shopping list</Text>
                </View>

                {/* Title + meta */}
                <View>
                    <Text style={styles.eyebrow}>For event</Text>
                    <Text style={styles.title}>{collectionTitle}</Text>
                    <Text style={styles.meta}>
                        {formattedDate}{location ? `  ·  ${location}` : ''}
                    </Text>

                    <View style={styles.summaryRow}>
                        {totalMissingCount > 0 && (
                            <Text style={[styles.pill, styles.pillDanger]}>
                                {totalMissingCount} to buy
                            </Text>
                        )}
                        {inList.length > 0 && (
                            <Text style={styles.pill}>{inList.length} in list</Text>
                        )}
                        {totalStockedCount > 0 && (
                            <Text style={styles.pill}>{totalStockedCount} stocked</Text>
                        )}
                    </View>
                </View>

                {/* To buy */}
                {missing.length > 0 && (
                    <View>
                        <Text style={styles.sectionHeader}>To buy</Text>
                        <ItemTable items={missing} variant="missing" />
                    </View>
                )}

                {/* Already in shopping list */}
                {inList.length > 0 && (
                    <View>
                        <Text style={styles.sectionHeader}>In your shopping list</Text>
                        <ItemTable items={inList} variant="list" />
                    </View>
                )}

                {/* Already stocked */}
                {stocked.length > 0 && (
                    <View>
                        <Text style={styles.sectionHeader}>Already stocked</Text>
                        <ItemTable items={stocked} variant="stocked" />
                    </View>
                )}

                {items.length === 0 && (
                    <Text style={[styles.meta, { marginTop: 24, textAlign: 'center' }]}>
                        No grocery items — your pantry already has everything for this event.
                    </Text>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text>Made with MixoGuide</Text>
                    <Text
                        render={({ pageNumber, totalPages }) =>
                            `${pageNumber} / ${totalPages}  ·  ${siteUrl}`
                        }
                    />
                </View>
            </Page>
        </Document>
    )
}

function ItemTable({ items, variant }: { items: GroceryItem[]; variant: 'missing' | 'list' | 'stocked' }) {
    return (
        <View>
            <View style={styles.tableHeader} fixed>
                <Text style={[styles.th, { width: 24 }]}> </Text>
                <Text style={[styles.th, { flex: 1 }]}>Ingredient</Text>
                <Text style={[styles.th, { width: 70, textAlign: 'right' }]}>Quantity</Text>
                <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>Status</Text>
            </View>
            {items.map(item => {
                const statusText =
                    variant === 'missing'
                        ? `Need ${formatUnit(item.missing, item.unit)}`
                        : variant === 'list'
                            ? 'In list'
                            : 'In pantry'
                const statusStyle =
                    variant === 'missing'
                        ? styles.statusMissing
                        : variant === 'list'
                            ? styles.statusPartial
                            : styles.statusStocked
                return (
                    <View key={item.ingredientId} style={styles.row} wrap={false}>
                        <View style={styles.checkbox} />
                        <Text style={styles.name}>{item.ingredientName}</Text>
                        <Text style={styles.qty}>{formatUnit(item.totalNeeded, item.unit)}</Text>
                        <Text style={[styles.status, statusStyle]}>{statusText}</Text>
                    </View>
                )
            })}
        </View>
    )
}
