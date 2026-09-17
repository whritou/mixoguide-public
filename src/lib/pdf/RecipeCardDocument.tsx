/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { baseStyles, C } from './styles'

/**
 * Minimal cocktail shape the PDF template needs. Defined locally so the
 * template doesn't couple to the API DTO (which carries many fields the PDF
 * never reads, e.g. timestamps, ratings, etc.).
 */
export interface RecipeCardCocktail {
    name:            string
    description:     string | null
    instructions:    string[]
    imageUrl:        string | null
    isAlcoholic:     boolean | null
    difficulty:      string
    preparationTime: number | null
    origin:          string | null
    glass?:          { name: string } | null
    ingredients?:    Array<{
        amount:    number | null
        unit:      string | null
        optional:  boolean
        ingredient: { name: string }
    }>
    barTools?: Array<{ barTool: { name: string } }>
}

const styles = StyleSheet.create({
    ...baseStyles,
    title: {
        fontFamily: 'Times-Italic',
        fontSize: 30,
        color: C.ink,
        lineHeight: 1.1,
        marginTop: 4,
    },
    description: {
        fontSize: 11,
        color: C.muted,
        marginTop: 8,
        lineHeight: 1.5,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
        flexWrap: 'wrap',
    },
    chip: {
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
        marginBottom: 4,
    },
    chipMuted: { backgroundColor: 'transparent', color: C.muted, borderWidth: 1, borderColor: C.bone },
    heroRow: {
        flexDirection: 'row',
        gap: 20,
        marginTop: 18,
    },
    heroImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
        objectFit: 'cover',
    },
    column: { flex: 1 },
    sectionHeader: {
        fontSize: 9,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: C.brown,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 10,
        marginTop: 18,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    ingredientBullet: {
        width: 14,
        color: C.caramel,
        fontFamily: 'Helvetica-Bold',
    },
    ingredientText: { flex: 1, fontSize: 11, color: C.charcoal },
    ingredientQty:  { fontSize: 11, color: C.brown, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    stepNumber: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: C.brown,
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        textAlign: 'center',
        paddingTop: 5,
        marginRight: 8,
    },
    stepText: { flex: 1, fontSize: 11, lineHeight: 1.55, color: C.charcoal },
    barToolsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
})

function formatUnit(amount: number | null | undefined, unit: string | null | undefined): string {
    if (amount == null && !unit) return ''
    const a = amount != null ? Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''
    return [a, unit].filter(Boolean).join(' ')
}

function formatTag(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface Props {
    cocktail: RecipeCardCocktail
    siteUrl:  string
}

export function RecipeCardDocument({ cocktail, siteUrl }: Props) {
    const ingredients = cocktail.ingredients ?? []
    const barTools    = cocktail.barTools    ?? []
    const tags        = [
        cocktail.difficulty,
        cocktail.preparationTime ? `${cocktail.preparationTime} min` : null,
        cocktail.isAlcoholic === false ? 'Mocktail' : null,
        cocktail.glass?.name ?? null,
    ].filter(Boolean) as string[]

    return (
        <Document title={`${cocktail.name} — MixoGuide recipe`}>
            <Page size="A4" style={styles.page}>
                {/* Brand header */}
                <View style={styles.brand}>
                    <Text style={styles.brandWord}>MixoGuide</Text>
                    <Text style={styles.eyebrow}>Recipe card</Text>
                </View>

                {/* Title + meta */}
                <View>
                    <Text style={styles.eyebrow}>
                        {cocktail.origin || (cocktail.isAlcoholic === false ? 'Mocktail' : 'Cocktail')}
                    </Text>
                    <Text style={styles.title}>{cocktail.name}</Text>
                    {cocktail.description && (
                        <Text style={styles.description}>{cocktail.description}</Text>
                    )}

                    {tags.length > 0 && (
                        <View style={styles.metaRow}>
                            {tags.map(t => (
                                <Text key={t} style={styles.chip}>{formatTag(t)}</Text>
                            ))}
                        </View>
                    )}
                </View>

                {/* Hero image + ingredients side by side */}
                <View style={styles.heroRow}>
                    {cocktail.imageUrl && (
                        <Image src={cocktail.imageUrl} style={styles.heroImage} />
                    )}

                    <View style={styles.column}>
                        <Text style={styles.sectionHeader}>Ingredients</Text>
                        {ingredients.length === 0 ? (
                            <Text style={styles.ingredientText}>No ingredients listed.</Text>
                        ) : (
                            ingredients.map((ing, i) => (
                                <View key={i} style={styles.ingredientRow}>
                                    <Text style={styles.ingredientBullet}>·</Text>
                                    <Text style={styles.ingredientText}>
                                        {ing.ingredient?.name ?? 'Unknown'}
                                        {ing.optional ? '  (optional)' : ''}
                                    </Text>
                                    <Text style={styles.ingredientQty}>
                                        {formatUnit(ing.amount, ing.unit)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* Instructions */}
                {cocktail.instructions && cocktail.instructions.length > 0 && (
                    <View>
                        <Text style={styles.sectionHeader}>Instructions</Text>
                        {cocktail.instructions.map((step, i) => (
                            <View key={i} style={styles.stepRow} wrap={false}>
                                <Text style={styles.stepNumber}>{i + 1}</Text>
                                <Text style={styles.stepText}>{step}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Bar tools */}
                {barTools.length > 0 && (
                    <View>
                        <Text style={styles.sectionHeader}>You&rsquo;ll need</Text>
                        <View style={styles.barToolsList}>
                            {barTools.map((bt, i) => (
                                <Text key={i} style={[styles.chip, styles.chipMuted]}>
                                    {bt.barTool.name}
                                </Text>
                            ))}
                        </View>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text>Made with MixoGuide</Text>
                    <Text>{siteUrl}</Text>
                </View>
            </Page>
        </Document>
    )
}
