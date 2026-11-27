export type DemoShelf = 'spirits' | 'modifiers' | 'fresh'

export type DemoBottleDefinition = {
    key: string
    label: string
    shelf: DemoShelf
    image: string
    ingredientName: string
}

export type DemoBottle = {
    key: string
    ingredientId: string | null
    label: string
    shelf: DemoShelf
    image: string
}

export const DEMO_BOTTLES: DemoBottleDefinition[] = [
    { key: 'bourbon', label: 'Bourbon',        shelf: 'spirits',   image: '/landing/bourbon.png', ingredientName: 'Bourbon' },
    { key: 'rye',     label: 'Rye',            shelf: 'spirits',   image: '/landing/rye.png',     ingredientName: 'Rye Whiskey' },
    { key: 'gin',     label: 'Gin',            shelf: 'spirits',   image: '/landing/gin.png',     ingredientName: 'Gin' },
    { key: 'rum',     label: 'White rum',      shelf: 'spirits',   image: '/landing/rum.png',     ingredientName: 'White rum' },
    { key: 'vodka',   label: 'Vodka',          shelf: 'spirits',   image: '/landing/vodka.png',   ingredientName: 'Vodka' },
    { key: 'tequila', label: 'Tequila',        shelf: 'spirits',   image: '/landing/tequila.png', ingredientName: 'Tequila' },
    { key: 'campari', label: 'Campari',        shelf: 'modifiers', image: '/landing/campari.png', ingredientName: 'Campari' },
    { key: 'sweetv',  label: 'Sweet vermouth', shelf: 'modifiers', image: '/landing/sweetv.png',  ingredientName: 'Sweet Vermouth' },
    { key: 'dryv',    label: 'Dry vermouth',   shelf: 'modifiers', image: '/landing/dryv.png',    ingredientName: 'Dry Vermouth' },
    { key: 'triple',  label: 'Triple sec',     shelf: 'modifiers', image: '/landing/triple.png',  ingredientName: 'Triple Sec' },
    { key: 'bitters', label: 'Angostura',      shelf: 'modifiers', image: '/landing/bitters.png', ingredientName: 'Angostura Bitters' },
    { key: 'lime',    label: 'Limes',          shelf: 'fresh',     image: '/landing/lime.png',    ingredientName: 'Lime' },
    { key: 'lemon',   label: 'Lemons',         shelf: 'fresh',     image: '/landing/lemon.png',   ingredientName: 'Lemon' },
    { key: 'syrup',   label: 'Sugar syrup',    shelf: 'fresh',     image: '/landing/syrup.png',   ingredientName: 'Sugar syrup' },
    { key: 'soda',    label: 'Soda water',     shelf: 'fresh',     image: '/landing/soda.png',    ingredientName: 'Soda Water' },
]
