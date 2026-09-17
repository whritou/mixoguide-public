import { useState, useEffect, useRef, type ComponentProps } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
    ScrollView, Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { defaultQuantityText, isDefaultQuantityText } from '@/lib/unitDefaults'
import { useIngredientSearch, useAddPantryItem, useUpdatePantryItem, useDeletePantryItem } from '@/features/pantry/hooks'
import { SwipeableSheet } from '@/components/ui/SwipeableSheet'
import { showGlobalNoticeDialog, useActionDialog } from '@/components/ui/ActionDialog'
import { UNITS, type Unit } from '@mixoguide/shared'
import { C, F, toneForId } from '@/theme/brand'
import { ingredientsApi } from '@/api/endpoints/ingredients'
import type { IngredientSearchResult, BarcodeIngredientCandidate, BarcodeProductInfo } from '@/api/endpoints/ingredients'
import type { UserPantryItemDTO } from '@mixoguide/shared'
import { BarcodeScannerSheet } from './BarcodeScannerSheet'
import { BarcodeCandidateSheet } from './BarcodeCandidateSheet'

type IconName = ComponentProps<typeof Ionicons>['name']
type PantryIngredientWithAbv = NonNullable<UserPantryItemDTO['ingredient']> & { abv?: number | null }

interface Props {
    visible: boolean
    onClose: () => void
    item?:   UserPantryItemDTO
}

type Step        = 'search' | 'details'
type Destination = 'pantry' | 'shopping'
type BarcodeSelectionContext = {
    barcode?: string | null
    product?: BarcodeProductInfo | null
}

const DEFAULT_UNIT: Unit = 'cl'
const HOLD_START_DELAY_MS = 350
const HOLD_INITIAL_REPEAT_MS = 170
const HOLD_MIN_REPEAT_MS = 35
const HOLD_DELAY_DECAY_MS = 900
const HOLD_MULTIPLIER_GROWTH_MS = 1400
const HOLD_MAX_MULTIPLIER = 10

function normalizeUnit(value?: string | null): Unit {
    return value && ([...UNITS] as string[]).includes(value) ? value as Unit : DEFAULT_UNIT
}

function parseQuantity(value: string): number {
    return parseFloat(value.replace(',', '.')) || 0
}

function cocktailUsageText(count?: number): string | null {
    if (!count || count <= 0) return null
    return `${count} cocktail${count === 1 ? '' : 's'}`
}

function formatDateInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function parseDateInput(value: string): string | null {
    const parts = value.split('/')
    if (parts.length !== 3) return null
    const [mm, dd, yyyy] = parts
    if (!mm || !dd || !yyyy || yyyy.length !== 4) return null
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
}

/** Parse an Open Food Facts `quantity` string ("750 ml", "70 cl", "1 L") into our units. */
function parseOffQuantity(raw: string | null | undefined): { qty: number; unit: Unit } | null {
    if (!raw) return null
    const m = raw.toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(ml|cl|cl\.|l|liter|litre|oz|g|kg|pcs)/i)
    if (!m) return null
    const value = parseFloat(m[1])
    if (!isFinite(value) || value <= 0) return null
    const u = m[2]
    if (u === 'ml')                       return { qty: +(value / 10).toFixed(1), unit: 'cl' }
    if (u === 'cl' || u === 'cl.')        return { qty: value, unit: 'cl' }
    if (u === 'l' || u === 'liter' || u === 'litre') return { qty: value * 100, unit: 'cl' }
    if (u === 'oz')                       return { qty: value, unit: 'oz' }
    if (u === 'g')                        return { qty: value, unit: 'g' }
    if (u === 'kg')                       return { qty: value * 1000, unit: 'g' }
    if (u === 'pcs')                      return { qty: value, unit: 'pcs' }
    return null
}

function isoToDateInput(iso: string | null | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const dd   = String(d.getDate()).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${mm}/${dd}/${yyyy}`
}

export function AddPantryItemSheet({ visible, onClose, item }: Props) {
    const isEdit = !!item

    const [step, setStep]           = useState<Step>(isEdit ? 'details' : 'search')
    const [search, setSearch]       = useState('')
    const [selected, setSelected]   = useState<IngredientSearchResult | null>(null)
    const [quantity, setQuantity]   = useState(defaultQuantityText(DEFAULT_UNIT))
    const [unit, setUnit]           = useState<Unit>(DEFAULT_UNIT)
    const [destination, setDest]    = useState<Destination>('pantry')
    const [expiryInput, setExpiry]  = useState('')
    const [note, setNote]           = useState('')
    const [isFavorite, setFavorite] = useState(false)
    const [isEssential, setEssential] = useState(false)
    const [isInfinite, setInfinite] = useState(false)

    const [scannerOpen, setScannerOpen]       = useState(false)
    const [scanLooking, setScanLooking]       = useState(false)
    const [scanCandidates, setScanCandidates] = useState<BarcodeIngredientCandidate[]>([])
    const [scanProduct, setScanProduct]       = useState<BarcodeProductInfo | null>(null)
    const [scanBarcode, setScanBarcode]       = useState<string | null>(null)
    const { openActionDialog, actionDialog }  = useActionDialog()
    const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const holdRepeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const holdStartedAt = useRef(0)
    const repeated = useRef(false)
    const quantityRef = useRef(parseQuantity(quantity))

    const debouncedSearch = useDebouncedValue(search, 350)
    const { data: results = [], isFetching } = useIngredientSearch(
        debouncedSearch,
        visible && !isEdit && step === 'search'
    )
    const addMutation    = useAddPantryItem()
    const updateMutation = useUpdatePantryItem()
    const deleteMutation = useDeletePantryItem()

    useEffect(() => {
        quantityRef.current = parseQuantity(quantity)
    }, [quantity])

    useEffect(() => {
        return stopQtyHold
    }, [])

    // Initialise/reset state whenever the sheet opens
    useEffect(() => {
        if (!visible) return
        if (item) {
            const dest: Destination = item.isInShoppingList && !item.isInPantry ? 'shopping' : 'pantry'
            const ingredient = item.ingredient as PantryIngredientWithAbv | null
            setStep('details')
            setSelected({
                id:          item.ingredientId,
                name:        ingredient?.name ?? '',
                imageUrl:    null,
                isAlcoholic: ingredient?.isAlcoholic ?? false,
                abv:         ingredient?.abv ?? null,
                brand:       null,
                unit:        null,
                type:        ingredient?.type ?? null,
                subType:     ingredient?.subType ?? null,
            })
            setQuantity(String(dest === 'pantry' ? (item.quantity || 0) : (item.shoppingQuantity || 0)))
            setUnit(normalizeUnit(item.unitLeft))
            setDest(dest)
            setExpiry(isoToDateInput(item.expirationDate))
            setNote(item.note ?? '')
            setFavorite(item.favorite ?? false)
            setEssential(item.isEssential ?? false)
            setInfinite(item.isInfinite ?? false)
        } else {
            reset()
        }
    }, [visible])

    function reset() {
        setStep('search')
        setSearch('')
        setSelected(null)
        setQuantity(defaultQuantityText(DEFAULT_UNIT))
        setUnit(DEFAULT_UNIT)
        setDest('pantry')
        setExpiry('')
        setNote('')
        setFavorite(false)
        setEssential(false)
        setInfinite(false)
    }

    function handleClose() { reset(); onClose() }

    function selectIngredient(ing: IngredientSearchResult, prefill?: { qty: number; unit: Unit }) {
        const nextUnit = prefill?.unit ?? normalizeUnit(ing.unit)
        setSelected(ing)
        setUnit(nextUnit)
        setQuantity(prefill ? String(prefill.qty) : defaultQuantityText(nextUnit))
        setStep('details')
    }

    function clearScanContext() {
        setScanCandidates([])
        setScanProduct(null)
        setScanBarcode(null)
    }

    async function pickFromBarcodeCandidate(c: BarcodeIngredientCandidate, context?: BarcodeSelectionContext) {
        try {
            const res  = await ingredientsApi.getById(c.id)
            const full = res.data.data
            const ing: IngredientSearchResult = {
                id:          full.id,
                name:        full.name,
                imageUrl:    full.imageUrl,
                isAlcoholic: full.isAlcoholic,
                abv:         full.abv,
                brand:       full.brand,
                unit:        full.unit ?? null,
                type:        full.type ?? null,
                subType:     full.subType ?? null,
                _count:      full._count,
            }
            const product = context?.product ?? scanProduct
            const barcode = context?.barcode ?? scanBarcode
            const prefill = parseOffQuantity(product?.quantity) ?? undefined
            if (barcode) {
                ingredientsApi.confirmBarcode(barcode, c.id).catch(() => undefined)
            }
            clearScanContext()
            selectIngredient(ing, prefill)
        } catch {
            showGlobalNoticeDialog({ title: 'Could not load ingredient', message: 'Please try again.', tone: 'danger', icon: 'close-circle-outline' })
        }
    }

    async function handleBarcodeScanned(barcode: string) {
        setScanLooking(true)
        try {
            const res = await ingredientsApi.lookupBarcode(barcode)
            const { ingredient, candidates, product } = res.data.data
            setScanProduct(product)
            setScanBarcode(barcode)
            if (ingredient) {
                await pickFromBarcodeCandidate(ingredient, { barcode, product })
                setScannerOpen(false)
                return
            }
            if (candidates.length > 0) {
                setScannerOpen(false)
                setScanCandidates(candidates)
                return
            }
            const label = product?.productName || product?.brand
                ? `${product?.brand ?? ''} ${product?.productName ?? ''}`.trim()
                : null
            showGlobalNoticeDialog({
                title:   'No matching ingredient',
                message: label
                    ? `We found "${label}" but couldn't match it to your catalog. Try searching by name.`
                    : 'Try searching for this ingredient by name.',
                icon:    'information-circle-outline',
            })
        } catch {
            showGlobalNoticeDialog({ title: 'Lookup failed', message: 'Could not look up that barcode. Please try again.', tone: 'danger', icon: 'close-circle-outline' })
        } finally {
            setScanLooking(false)
        }
    }

    function selectUnit(nextUnit: Unit) {
        const shouldUseDefault = !isEdit && (
            quantity.trim() === '' || isDefaultQuantityText(quantity, unit)
        )

        setUnit(nextUnit)
        if (shouldUseDefault) setQuantity(defaultQuantityText(nextUnit))
    }

    function formatQuantityValue(value: number): string {
        return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, '').replace(/\.$/, '')
    }

    function stopQtyHold() {
        if (holdTimeout.current) clearTimeout(holdTimeout.current)
        if (holdRepeatTimer.current) clearTimeout(holdRepeatTimer.current)
        holdTimeout.current = null
        holdRepeatTimer.current = null
    }

    function holdMultiplier(elapsedMs: number): number {
        return Math.min(
            HOLD_MAX_MULTIPLIER,
            Math.max(1, Math.floor(Math.exp(elapsedMs / HOLD_MULTIPLIER_GROWTH_MS))),
        )
    }

    function holdDelay(elapsedMs: number): number {
        return Math.max(
            HOLD_MIN_REPEAT_MS,
            Math.round(HOLD_INITIAL_REPEAT_MS * Math.exp(-elapsedMs / HOLD_DELAY_DECAY_MS)),
        )
    }

    function setQuantityValue(next: number) {
        const normalized = Math.max(0, Math.round(next * 100) / 100)
        quantityRef.current = normalized
        setQuantity(formatQuantityValue(normalized))
    }

    function adjustQty(delta: number) {
        setQuantityValue(quantityRef.current + delta)
    }

    function scheduleQtyRepeat(delta: number) {
        const elapsed = Date.now() - holdStartedAt.current
        adjustQty(delta * holdMultiplier(elapsed))
        holdRepeatTimer.current = setTimeout(() => scheduleQtyRepeat(delta), holdDelay(elapsed))
    }

    function startQtyHold(delta: number) {
        stopQtyHold()
        repeated.current = false
        holdStartedAt.current = Date.now()
        holdTimeout.current = setTimeout(() => {
            repeated.current = true
            scheduleQtyRepeat(delta)
        }, HOLD_START_DELAY_MS)
    }

    function handleQtyPress(delta: number) {
        if (!repeated.current) adjustQty(delta)
    }

    function handleConfirm() {
        const qty            = parseQuantity(quantity)
        const expirationDate = destination === 'pantry' ? parseDateInput(expiryInput) : null

        if (isEdit && item) {
            updateMutation.mutate(
                {
                    id:      item.id,
                    payload: {
                        quantity:         destination === 'pantry'   ? qty : 0,
                        shoppingQuantity: destination === 'shopping' ? qty : undefined,
                        unitLeft:         unit,
                        isInPantry:       destination === 'pantry',
                        isInShoppingList: destination === 'shopping',
                        expirationDate,
                        note:             note.trim() || undefined,
                        favorite:         isFavorite,
                        isEssential,
                        isInfinite,
                    },
                },
                { onSuccess: handleClose }
            )
        } else {
            if (!selected) return
            addMutation.mutate(
                {
                    ingredientId:     selected.id,
                    quantity:         destination === 'pantry'   ? qty : 0,
                    shoppingQuantity: destination === 'shopping' ? qty : undefined,
                    unitLeft:         unit,
                    isInPantry:       destination === 'pantry',
                    isInShoppingList: destination === 'shopping',
                    expirationDate,
                    note:             note.trim() || undefined,
                    favorite:         isFavorite,
                    isEssential,
                    isInfinite,
                },
                { onSuccess: handleClose }
            )
        }
    }

    function handleDelete() {
        if (!item) return
        const name = item.ingredient?.name ?? 'this item'
        openActionDialog({
            title:        'Remove ingredient',
            message:      `Remove ${name} from your pantry?`,
            confirmLabel: 'Remove',
            tone:         'danger',
            icon:         'close-circle-outline',
            onConfirm:    () => deleteMutation.mutate(item.id, { onSuccess: handleClose }),
        })
    }

    const isPending = addMutation.isPending || updateMutation.isPending
    const mainSheetVisible = visible && !scannerOpen && scanCandidates.length === 0
    const canConfirm = step === 'details' && !!selected && !isPending

    return (
        <>
        <SwipeableSheet visible={mainSheetVisible} onClose={handleClose}>
            <KeyboardAvoidingView
                style={s.root}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* ── Header ─────────────────────────────────── */}
                <View style={s.header}>
                    <TouchableOpacity
                        style={s.navBtn}
                        onPress={(!isEdit && step === 'details') ? () => setStep('search') : handleClose}
                    >
                        {!isEdit && step === 'details'
                            ? <Ionicons name="arrow-back" size={17} color={C.mute} />
                            : null}
                        <Text style={s.navText}>
                            {!isEdit && step === 'details' ? 'Back' : 'Cancel'}
                        </Text>
                    </TouchableOpacity>

                    <View style={s.headerCenter}>
                        <Text style={s.eyebrow}>
                            {isEdit ? 'Edit ingredient' : step === 'search' ? 'New ingredient' : 'Details'}
                        </Text>
                        <Text style={s.title} numberOfLines={1}>
                            {isEdit
                                ? (item?.ingredient?.name ?? 'Edit item')
                                : step === 'search' ? 'Add to pantry' : (selected?.name ?? '')}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[s.saveBtn, !canConfirm && s.saveBtnDisabled]}
                        onPress={handleConfirm}
                        disabled={!canConfirm}
                    >
                        <Text style={[s.saveText, !canConfirm && s.saveTextDisabled]}>
                            {isPending ? 'Saving...' : isEdit ? 'Save' : 'Add'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={s.divider} />

                {/* ── Step 1: Search (add mode only) ─────────── */}
                {!isEdit && step === 'search' ? (
                    <>
                        <View style={s.searchRow}>
                            <View style={s.searchWrap}>
                                <Ionicons name="search-outline" size={17} color={C.mute} />
                                <TextInput
                                    style={s.searchInput}
                                    placeholder="Search ingredients…"
                                    placeholderTextColor={C.mute}
                                    value={search}
                                    onChangeText={setSearch}
                                    autoFocus
                                    returnKeyType="search"
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                />
                                {search.length > 0 ? (
                                    <TouchableOpacity
                                        onPress={() => setSearch('')}
                                        accessibilityRole="button"
                                        accessibilityLabel="Clear pantry ingredient search"
                                        hitSlop={8}
                                    >
                                        <Ionicons name="close-circle" size={16} color={C.mute} />
                                    </TouchableOpacity>
                                ) : null}
                                {isFetching
                                    ? <ActivityIndicator size="small" color={C.bronze} />
                                    : null}
                            </View>
                            <TouchableOpacity
                                style={s.scanBtn}
                                onPress={() => setScannerOpen(true)}
                                accessibilityLabel="Scan barcode"
                                hitSlop={6}
                            >
                                <Ionicons name="barcode-outline" size={20} color="#f5ece0" />
                            </TouchableOpacity>
                        </View>

                        {results.length === 0 && !isFetching ? (
                            <View style={s.hint}>
                                <Ionicons name="search-outline" size={36} color={C.border} />
                                <Text style={s.hintText}>
                                    {search.trim() ? `No results for "${search}"` : 'No ingredients found'}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={results}
                                keyExtractor={it => it.id}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={s.resultList}
                                renderItem={({ item: it }) => (
                                    <IngredientResult item={it} onPress={() => selectIngredient(it)} />
                                )}
                            />
                        )}
                    </>
                ) : (

                    /* ── Step 2: Details ───────────────────────── */
                    <ScrollView
                        contentContainerStyle={s.detailsScroll}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Selected ingredient card */}
                        {selected && (
                            <View style={s.ingCard}>
                                <View style={[s.ingCircle, { backgroundColor: toneForId(selected.id) }]}>
                                    <Text style={s.ingInitial}>{selected.name.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.ingName}>{selected.name}</Text>
                                    <Text style={s.ingMeta}>
                                        {[selected.type?.name, selected.subType?.name].filter(Boolean).join(' · ')}
                                        {selected.abv ? ` · ${selected.abv}% ABV` : ''}
                                    </Text>
                                    {cocktailUsageText(selected._count?.cocktailIngredients) && (
                                        <Text style={s.ingUsage}>
                                            Used in {cocktailUsageText(selected._count?.cocktailIngredients)}
                                        </Text>
                                    )}
                                </View>
                                {selected.isAlcoholic ? (
                                    <View style={s.alcBadge}>
                                        <Text style={s.alcBadgeText}>Alcoholic</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}

                        {/* Destination */}
                        <FormSection label="Add to">
                            <View style={s.destRow}>
                                <DestBtn
                                    label="Pantry"
                                    icon="file-tray-stacked-outline"
                                    active={destination === 'pantry'}
                                    onPress={() => setDest('pantry')}
                                />
                                <DestBtn
                                    label="Shopping list"
                                    icon="cart-outline"
                                    active={destination === 'shopping'}
                                    onPress={() => setDest('shopping')}
                                />
                            </View>
                        </FormSection>

                        {/* Amount */}
                        <FormSection label="Amount">
                            <View style={s.amtRow}>
                                <TouchableOpacity
                                    style={s.stepBtn}
                                    onPress={() => handleQtyPress(-1)}
                                    onPressIn={() => startQtyHold(-1)}
                                    onPressOut={stopQtyHold}
                                    accessibilityRole="button"
                                    accessibilityLabel="Decrease pantry ingredient quantity"
                                >
                                    <Ionicons name="remove" size={18} color={C.ink} />
                                </TouchableOpacity>
                                <TextInput
                                    style={s.qtyInput}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="decimal-pad"
                                    selectTextOnFocus
                                />
                                <TouchableOpacity
                                    style={s.stepBtn}
                                    onPress={() => handleQtyPress(1)}
                                    onPressIn={() => startQtyHold(1)}
                                    onPressOut={stopQtyHold}
                                    accessibilityRole="button"
                                    accessibilityLabel="Increase pantry ingredient quantity"
                                >
                                    <Ionicons name="add" size={18} color={C.ink} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={[...UNITS]}
                                horizontal
                                keyExtractor={u => u}
                                showsHorizontalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={s.unitRow}
                                style={{ marginTop: 12 }}
                                renderItem={({ item: u }) => (
                                    <TouchableOpacity
                                        style={[s.unitChip, unit === u && s.unitChipActive]}
                                        onPress={() => selectUnit(u)}
                                    >
                                        <Text style={[s.unitChipText, unit === u && s.unitChipTextActive]}>{u}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </FormSection>

                        {/* Expiry date (pantry only) */}
                        {destination === 'pantry' && (
                            <FormSection label="Best before">
                                <View style={s.dateWrap}>
                                    <Ionicons name="calendar-outline" size={16} color={C.mute} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={s.dateInput}
                                        placeholder="MM/DD/YYYY"
                                        placeholderTextColor={C.mute}
                                        value={expiryInput}
                                        onChangeText={v => setExpiry(formatDateInput(v))}
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                    {expiryInput.length > 0 && (
                                        <TouchableOpacity onPress={() => setExpiry('')} hitSlop={8}>
                                            <Ionicons name="close-circle" size={16} color={C.mute} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </FormSection>
                        )}

                        {/* Note */}
                        <FormSection label="Note">
                            <TextInput
                                style={s.noteInput}
                                placeholder="Any notes about this item…"
                                placeholderTextColor={C.mute}
                                value={note}
                                onChangeText={t => setNote(t.slice(0, 500))}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                            {note.length > 400 && (
                                <Text style={s.noteCount}>{note.length}/500</Text>
                            )}
                        </FormSection>

                        {/* Toggles */}
                        <FormSection label="Options">
                            <ToggleRow
                                icon="heart-outline"
                                label="Favourite"
                                sub="Pin to your top shelf"
                                value={isFavorite}
                                onToggle={setFavorite}
                            />
                            <View style={s.toggleDivider} />
                            <ToggleRow
                                icon="star-outline"
                                label="Essential"
                                sub="A pantry staple you always keep"
                                value={isEssential}
                                onToggle={setEssential}
                            />
                            <View style={s.toggleDivider} />
                            <ToggleRow
                                icon="infinite-outline"
                                label="Always stocked"
                                sub="Water, sugar, syrup… never runs out"
                                value={isInfinite}
                                onToggle={setInfinite}
                            />
                        </FormSection>

                        {/* Delete (edit mode only) */}
                        {isEdit && (
                            <TouchableOpacity
                                style={[s.deleteBtn, deleteMutation.isPending && { opacity: 0.5 }]}
                                onPress={handleDelete}
                                disabled={deleteMutation.isPending}
                            >
                                <Ionicons name="trash-outline" size={15} color="#ef4444" />
                                <Text style={s.deleteBtnText}>Remove from pantry</Text>
                            </TouchableOpacity>
                        )}

                        <View style={{ height: 32 }} />
                    </ScrollView>
                )}
            </KeyboardAvoidingView>

        </SwipeableSheet>

            <BarcodeScannerSheet
                visible={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScanned={handleBarcodeScanned}
                busy={scanLooking}
                busyLabel="Looking up product…"
            />

            <BarcodeCandidateSheet
                visible={scanCandidates.length > 0}
                onClose={clearScanContext}
                product={scanProduct}
                candidates={scanCandidates}
                onPick={(c) => { void pickFromBarcodeCandidate(c) }}
                onSearchManually={() => {
                    const seed = scanProduct?.productName ?? scanProduct?.brand ?? ''
                    if (seed) setSearch(seed)
                    clearScanContext()
                }}
            />
            {actionDialog}
        </>
    )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IngredientResult({ item, onPress }: { item: IngredientSearchResult; onPress: () => void }) {
    const bg = toneForId(item.id)
    const usage = cocktailUsageText(item._count?.cocktailIngredients)
    return (
        <TouchableOpacity style={r.row} onPress={onPress} activeOpacity={0.7}>
            <View style={[r.circle, { backgroundColor: bg }]}>
                <Text style={r.initial}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={r.info}>
                <Text style={r.name}>{item.name}</Text>
                <Text style={r.sub}>
                    {[item.type?.name, item.subType?.name].filter(Boolean).join(' · ') || 'Ingredient'}
                </Text>
                {usage && <Text style={r.usage}>{usage}</Text>}
            </View>
            {item.isAlcoholic && (
                <View style={r.alcBadge}>
                    <Text style={r.alcBadgeText}>Alc</Text>
                </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={C.mute} />
        </TouchableOpacity>
    )
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={fs.section}>
            <Text style={fs.label}>{label}</Text>
            {children}
        </View>
    )
}

function DestBtn({ label, icon, active, onPress }: {
    label: string; icon: IconName; active: boolean; onPress: () => void
}) {
    return (
        <TouchableOpacity
            style={[d.btn, active && d.btnActive]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Ionicons name={icon} size={16} color={active ? '#f5ece0' : C.mute} />
            <Text style={[d.text, active && d.textActive]}>{label}</Text>
        </TouchableOpacity>
    )
}

function ToggleRow({ icon, label, sub, value, onToggle }: {
    icon: IconName; label: string; sub: string; value: boolean; onToggle: (v: boolean) => void
}) {
    return (
        <View style={tg.row}>
            <View style={[tg.iconCircle, value && tg.iconCircleActive]}>
                <Ionicons name={icon} size={16} color={value ? C.bronze : C.mute} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={tg.label}>{label}</Text>
                <Text style={tg.sub}>{sub}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: C.border, true: C.bronzeLight }}
                thumbColor={value ? C.bronze : '#f0ebe3'}
                ios_backgroundColor={C.border}
            />
        </View>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root:         { flex: 1, backgroundColor: C.cream },

    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
    headerCenter: { alignItems: 'center', flex: 1 },
    eyebrow:      { fontSize: 8, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: C.bronze, marginBottom: 2 },
    title:        { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, fontWeight: '400', color: C.ink },
    navBtn:       { width: 58, flexDirection: 'row', alignItems: 'center', gap: 3 },
    navText:      { fontSize: 13, color: C.mute, fontWeight: '500' },
    saveBtn:      { minWidth: 76, height: 38, borderRadius: 19, paddingHorizontal: 14, backgroundColor: C.bronze, alignItems: 'center', justifyContent: 'center' },
    saveBtnDisabled:{ backgroundColor: C.creamWarm },
    saveText:     { fontSize: 12, fontWeight: '800', color: '#f5ece0', letterSpacing: 0.8, textTransform: 'uppercase' },
    saveTextDisabled:{ color: C.mute },
    divider:      { height: 1, backgroundColor: C.border },

    searchRow:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 10, gap: 8 },
    searchWrap:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 0, minHeight: 38, borderWidth: 1, borderColor: C.border, gap: 8 },
    searchInput:  { flex: 1, height: 36, paddingVertical: 0, fontSize: 14, color: C.ink },
    scanBtn:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bronze, shadowColor: C.bronze, shadowOpacity: 0.22, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },

    hint:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
    hintText:     { fontSize: 13, color: C.mute },

    resultList:   { paddingTop: 4 },

    detailsScroll:{ paddingHorizontal: 16, paddingTop: 12 },

    ingCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, gap: 14, marginBottom: 4 },
    ingCircle:    { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    ingInitial:   { fontFamily: F.head, fontStyle: 'italic', fontSize: 22, color: 'rgba(255,255,255,0.9)' },
    ingName:      { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, color: C.ink },
    ingMeta:      { fontSize: 11, color: C.mute, marginTop: 2 },
    ingUsage:     { fontFamily: F.mono, fontSize: 10, color: C.bronze, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
    alcBadge:     { backgroundColor: C.amber, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    alcBadgeText: { fontSize: 9, fontWeight: '700', color: C.bronze, letterSpacing: 1 },

    destRow:      { flexDirection: 'row', gap: 10 },

    amtRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBtn:      { width: 42, height: 42, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    qtyInput:     { flex: 1, height: 42, borderWidth: 1, borderColor: C.border, borderRadius: 14, backgroundColor: C.card, textAlign: 'center', fontSize: 15, fontWeight: '700', color: C.ink, fontFamily: F.mono },
    unitRow:      { gap: 8 },
    unitChip:           { height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
    unitChipActive:     { borderColor: C.bronze, backgroundColor: C.bronze },
    unitChipText:       { fontFamily: F.mono, fontSize: 12, color: C.mute },
    unitChipTextActive: { color: '#fff', fontWeight: '700' },

    dateWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
    dateInput:    { flex: 1, fontSize: 14, color: C.ink, fontFamily: F.mono },

    noteInput:    { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.ink, minHeight: 80 },
    noteCount:    { fontSize: 10, color: C.mute, textAlign: 'right', marginTop: 4, fontFamily: F.mono },

    toggleDivider:{ height: 1, backgroundColor: C.border, marginVertical: 2 },

    deleteBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 12 },
    deleteBtnText:{ fontSize: 13, color: '#ef4444', fontWeight: '600' },
})

const r = StyleSheet.create({
    row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
    circle:       { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    initial:      { fontFamily: F.head, fontStyle: 'italic', fontSize: 18, color: 'rgba(255,255,255,0.9)' },
    info:         { flex: 1 },
    name:         { fontSize: 15, fontWeight: '600', color: C.ink },
    sub:          { fontSize: 11, color: C.mute, marginTop: 2 },
    usage:        { fontFamily: F.mono, fontSize: 10, color: C.bronze, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    alcBadge:     { backgroundColor: C.amber, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    alcBadgeText: { fontSize: 9, fontWeight: '700', color: C.bronze, letterSpacing: 1 },
})

const fs = StyleSheet.create({
    section: { marginTop: 22 },
    label:   { fontSize: 9, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: C.mute, marginBottom: 10 },
})

const d = StyleSheet.create({
    btn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
    btnActive: { borderColor: C.bronze, backgroundColor: C.bronze },
    text:      { fontSize: 13, fontWeight: '600', color: C.mute },
    textActive:{ color: '#f5ece0' },
})

const tg = StyleSheet.create({
    row:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
    iconCircle:      { width: 36, height: 36, borderRadius: 11, backgroundColor: C.creamWarm, alignItems: 'center', justifyContent: 'center' },
    iconCircleActive:{ backgroundColor: '#f5ece01a' },
    label:           { fontSize: 14, fontWeight: '600', color: C.ink },
    sub:             { fontSize: 11, color: C.mute, marginTop: 2 },
})
