import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
async function main() {
    /**
     * ─── INGREDIENT TYPES ────────────────────────────────────────────────────────
     *
     * Top-level buckets. Kept broad and mutually exclusive so every ingredient
     * has exactly one obvious home.
     */
    const typeNames = [
        'Spirit',           // Distilled alcoholic base (vodka, gin, rum…)
        'Liqueur',          // Sweetened, flavoured spirits (Cointreau, Campari…)
        'Fortified Wine',   // Wine + spirit (vermouth, port, sherry…)
        'Wine',             // Unfortified still & sparkling wine
        'Beer & Cider',     // Beer, lager, cider
        'Juice',            // Fruit & vegetable juices (fresh-pressed or packaged)
        'Carbonated Mixer', // Sodas, tonic, sparkling waters
        'Sweetener',        // Syrups, sugar, honey
        'Bitters',          // Concentrated aromatic bitters
        'Fresh Produce',    // Whole fruits, herbs, vegetables used as ingredient
        'Dairy & Egg',      // Cream, milk, eggs
        'Garnish',          // Items used exclusively as garnish/rim (peels, cherries…)
        'Other',            // Ice, coconut water, esoteric items
    ]

    await prisma.ingredientType.createMany({
        data: typeNames.map(name => ({ name })),
        skipDuplicates: true,
    })

    const dbTypes = await prisma.ingredientType.findMany()
    const T = Object.fromEntries(dbTypes.map((t: { name: string; id: string }) => [t.name, t.id]))

    /**
     * ─── INGREDIENT SUB-TYPES ────────────────────────────────────────────────────
     *
     * Sub-types describe the *style* or *category* within a type — not the
     * ingredient name itself. This prevents the name≈subType duplication that
     * existed before (e.g. subType "Vodka" under type "Spirit" is redundant when
     * the ingredient is also called "Vodka").
     *
     * Convention: SubType = style/region/processing method, not product name.
     */
    const sub: { name: string; typeId: string }[] = []
    const pushSub = (type: string, arr: string[]) =>
        arr.forEach(name => sub.push({ name, typeId: T[type] }))

    pushSub('Spirit', [
        'Unflavoured Vodka',
        'Flavoured Vodka',
        'London Dry Gin',
        'New Western / Contemporary Gin',
        'Sloe Gin',
        'White / Silver Rum',
        'Dark / Aged Rum',
        'Spiced Rum',
        'Overproof Rum',
        'Blanco Tequila',
        'Reposado Tequila',
        'Añejo Tequila',
        'Mezcal',
        'Scotch Whisky',
        'Bourbon Whiskey',
        'Rye Whiskey',
        'Irish Whiskey',
        'Japanese Whisky',
        'Brandy / Cognac',
        'Armagnac',
        'Pisco',
        'Cachaça',
        'Aquavit',
        'Absinthe / Pastis',
        'Grappa',
        'Baijiu',
        'Soju',
    ])

    pushSub('Liqueur', [
        'Orange / Citrus Liqueur',
        'Coffee Liqueur',
        'Nut & Almond Liqueur',
        'Herbal & Botanical Liqueur',
        'Cream Liqueur',
        'Berry & Fruit Liqueur',
        'Tropical Fruit Liqueur',
        'Elderflower Liqueur',
        'Aperitivo (Bitter)',
        'Amaro',
        'Cherry Liqueur',
        'Peach & Apricot Liqueur',
        'Melon Liqueur',
        'Chocolate & Mocha Liqueur',
        'Anise & Sambuca',
        'Falernum',
    ])

    pushSub('Fortified Wine', [
        'Sweet Vermouth',
        'Dry Vermouth',
        'Bianco / Blanc Vermouth',
        'Ruby Port',
        'Tawny Port',
        'Fino / Manzanilla Sherry',
        'Amontillado Sherry',
        'Cream Sherry',
        'Madeira',
        'Sake',
    ])

    pushSub('Wine', [
        'Brut Champagne',
        'Prosecco / Cava',
        'Pétillant Naturel',
        'Dry White Wine',
        'Rosé Wine',
        'Light Red Wine',
        'Dessert Wine',
    ])

    pushSub('Beer & Cider', [
        'Lager / Pilsner',
        'Wheat Beer',
        'Stout & Porter',
        'IPA',
        'Ginger Beer',
        'Hard Cider',
    ])

    pushSub('Juice', [
        'Citrus Juice',
        'Tropical Juice',
        'Berry Juice',
        'Stone Fruit Juice',
        'Vegetable Juice',
        'Apple & Pear Juice',
        'Coconut Water',
    ])

    pushSub('Carbonated Mixer', [
        'Club Soda / Sparkling Water',
        'Tonic Water',
        'Diet Tonic Water',
        'Cola',
        'Diet Cola',
        'Ginger Beer (Non-Alcoholic)',
        'Ginger Ale',
        'Lemon-Lime Soda',
        'Cream Soda',
        'Root Beer',
    ])

    pushSub('Sweetener', [
        'Simple Syrup (1:1)',
        'Rich Simple Syrup (2:1)',
        'Honey Syrup',
        'Agave Syrup',
        'Demerara / Brown Sugar Syrup',
        'Grenadine',
        'Orgeat (Almond Syrup)',
        'Passion Fruit Syrup',
        'Raspberry Syrup',
        'Vanilla Syrup',
        'Cinnamon Syrup',
        'Maple Syrup',
        'Falernum Syrup',
        'Gomme Syrup',
        'Coconut Syrup',
    ])

    pushSub('Bitters', [
        'Aromatic Bitters',
        'Orange Bitters',
        'Creole / Peychaud\'s Bitters',
        'Mole & Chocolate Bitters',
        'Celery Bitters',
        'Peach Bitters',
        'Lavender Bitters',
        'Grapefruit Bitters',
        'Walnut Bitters',
    ])

    pushSub('Fresh Produce', [
        'Citrus Fruit',
        'Tropical Fruit',
        'Stone Fruit',
        'Berry',
        'Herb',
        'Vegetable',
        'Spice / Root',
        'Melon',
    ])

    pushSub('Dairy & Egg', [
        'Cream',
        'Milk',
        'Egg White',
        'Egg Yolk',
        'Whole Egg',
        'Plant-Based Cream',
    ])

    pushSub('Garnish', [
        'Citrus Twist / Peel',
        'Citrus Wheel / Slice',
        'Citrus Wedge',
        'Cocktail Cherry',
        'Olive & Onion',
        'Herb Sprig',
        'Spice Dust',
        'Rim Salt / Sugar',
        'Edible Flower',
        'Skewer / Pick',
    ])

    pushSub('Other', [
        'Ice',
        'Coconut Milk / Cream',
        'Hot Water / Tea',
        'Egg Replacer / Foam',
        'Salt / Saline Solution',
    ])

    await prisma.ingredientSubType.createMany({ data: sub, skipDuplicates: true })

    const dbSub = await prisma.ingredientSubType.findMany()
    const S = Object.fromEntries(dbSub.map((s: { name: string; id: string }) => [s.name, s.id]))

    /**
     * ─── GLASSES ──────────────────────────────────────────────────────────────────
     */
    const glasses = [
        { name: 'Highball',      description: 'Tall glass for long drinks',               imageUrl: 'https://images.pexels.com/photos/19960198/pexels-photo-19960198.jpeg' },
        { name: 'Martini',       description: 'Classic V-shaped cocktail glass',           imageUrl: 'https://images.pexels.com/photos/31208492/pexels-photo-31208492.jpeg' },
        { name: 'Old Fashioned', description: 'Short tumbler for spirit-forward drinks',   imageUrl: 'https://images.pexels.com/photos/12716237/pexels-photo-12716237.jpeg' },
        { name: 'Coupe',         description: 'Rounded stemmed glass',                     imageUrl: 'https://images.pexels.com/photos/30133537/pexels-photo-30133537.jpeg' },
        { name: 'Margarita',     description: 'Wide-rimmed glass',                         imageUrl: 'https://images.pexels.com/photos/36580799/pexels-photo-36580799.jpeg' },
        { name: 'Rocks',         description: 'Short glass, usually served over ice',      imageUrl: 'https://images.pexels.com/photos/32677757/pexels-photo-32677757.jpeg' },
        { name: 'Collins',       description: 'Tall, narrow glass',                        imageUrl: 'https://images.pexels.com/photos/13851259/pexels-photo-13851259.jpeg' },
        { name: 'Flute',         description: 'Tall slender sparkling wine glass',         imageUrl: 'https://images.pexels.com/photos/34981129/pexels-photo-34981129.jpeg' },
        { name: 'Hurricane',     description: 'Curved tiki-style glass',                   imageUrl: 'https://images.pexels.com/photos/10986588/pexels-photo-10986588.jpeg' },
        { name: 'Nick & Nora',   description: 'Small elegant stemmed glass',               imageUrl: 'https://images.pexels.com/photos/36189467/pexels-photo-36189467.jpeg' },
        { name: 'Copper Mug',    description: 'Metal mug for Moscow Mule',                 imageUrl: 'https://images.unsplash.com/photo-1607673882965-c9646f9b45e4?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
        { name: 'Shot',          description: 'Small 1–2 oz glass',                        imageUrl: 'https://images.pexels.com/photos/9474743/pexels-photo-9474743.jpeg' },
        { name: 'Snifter',       description: 'Wide-bottomed glass for brandy & cognac',   imageUrl: 'https://images.pexels.com/photos/5659175/pexels-photo-5659175.jpeg' },
        { name: 'Julep Cup',     description: 'Metal cup for juleps',                      imageUrl: 'https://images.unsplash.com/photo-1568644205324-92c64f85b75f?q=80&w=1271&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
        { name: 'Tiki Mug',      description: 'Decorative tropical mug',                   imageUrl: 'https://images.pexels.com/photos/20081523/pexels-photo-20081523.jpeg' },
        { name: 'Wine Glass',    description: 'Standard wine glass, used for spritz',      imageUrl: 'https://images.pexels.com/photos/7367744/pexels-photo-7367744.jpeg' },
        { name: 'Irish Coffee',  description: 'Heat-proof glass mug',                      imageUrl: 'https://images.unsplash.com/photo-1651789535050-2e2b4d9b6703?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
        { name: 'Teacup',        description: 'Used for tea-based hot cocktails',          imageUrl: 'https://images.pexels.com/photos/34554801/pexels-photo-34554801.jpeg' },
        { name: 'Punch Cup',     description: 'Small cup for punch service',               imageUrl: 'https://images.unsplash.com/photo-1599070639100-282914a3a701?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    ]

    for (const g of glasses) {
        await prisma.glass.upsert({
            where:  { name: g.name },
            update: { description: g.description, imageUrl: g.imageUrl },
            create: { name: g.name, description: g.description, imageUrl: g.imageUrl },
        })
    }

    /**
     * ─── BAR TOOLS ────────────────────────────────────────────────────────────────
     */
    const barTools = [
        { name: 'Shaker',        type: 'bar'     as const, isEssential: true,  imageUrl: 'https://images.unsplash.com/photo-1582571352031-0f7b5d4c9b60' },
        { name: 'Strainer',      type: 'bar'     as const, isEssential: true,  imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092' },
        { name: 'Jigger',        type: 'bar'     as const, isEssential: true },
        { name: 'Muddler',       type: 'bar'     as const, isEssential: false, imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba' },
        { name: 'Bar Spoon',     type: 'bar'     as const, isEssential: true,  imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554' },
        { name: 'Mixing Glass',  type: 'bar'     as const, isEssential: false },
        { name: 'Blender',       type: 'kitchen' as const, isEssential: false, imageUrl: 'https://images.unsplash.com/photo-1570197571499-166b36435e9f' },
        { name: 'Citrus Juicer', type: 'kitchen' as const, isEssential: false },
        { name: 'Fine Strainer', type: 'bar'     as const, isEssential: false, imageUrl: 'https://images.unsplash.com/photo-1604909052743-94e838986d24' },
        { name: 'Peeler',        type: 'kitchen' as const, isEssential: false, imageUrl: 'https://images.unsplash.com/photo-1582582494700-0a7a3f5c2c1b' },
        { name: 'Ice Scoop',     type: 'bar'     as const, isEssential: false, imageUrl: 'https://images.unsplash.com/photo-1582571352031-0f7b5d4c9b60' },
        { name: 'Lewis Bag',     type: 'bar'     as const, isEssential: false, imageUrl: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6' },
        { name: 'Channel Knife', type: 'bar'     as const, isEssential: false, imageUrl: 'https://images.unsplash.com/photo-1582582494700-0a7a3f5c2c1b' },
        { name: 'Bottle Opener', type: 'bar'     as const, isEssential: true,  imageUrl: 'https://images.unsplash.com/photo-1585386959984-a41552262a7b' },
        { name: 'Corkscrew',     type: 'bar'     as const, isEssential: true,  imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8' },
        { name: 'Torch',         type: 'bar'     as const, isEssential: false, imageUrl: 'https://images.unsplash.com/photo-1574781781706-f7a1b5e9ba0a' },
    ]

    for (const bt of barTools) {
        await prisma.barTool.upsert({
            where:  { name: bt.name },
            update: { type: bt.type, isEssential: bt.isEssential, imageUrl: bt.imageUrl },
            create: { name: bt.name, type: bt.type, isEssential: bt.isEssential, imageUrl: bt.imageUrl },
        })
    }

    /**
     * ─── INGREDIENTS ──────────────────────────────────────────────────────────────
     *
     * Design decisions:
     *  1. Generic ingredients (e.g. "Vodka") sit alongside brand variants
     *     (e.g. "Grey Goose Vodka") — brands use the same type/subType.
     *  2. SubType names are style descriptors, NOT the ingredient name, so
     *     'Vodka' ingredient has subType 'Unflavoured Vodka' — no duplication.
     *  3. Juices exist as ingredients (bought/bottled); fresh citrus sits in
     *     Fresh Produce and yields juice via derivations.
     *  4. Items used ONLY as garnish live under type 'Garnish'.
     */
    type IngDef = {
        name:           string
        type:           string
        sub:            string
        abv?:           number
        isAlcoholic:    boolean
        imageUrl?:      string
    }

    const ingredientsData: IngDef[] = [
        // ── BASE INGREDIENTS ────────────────────────────────────────────────
        { name: 'Lemon',      type: 'Fresh Produce', sub: 'Citrus Fruit', abv: 0, isAlcoholic: false },
        { name: 'Lime',       type: 'Fresh Produce', sub: 'Citrus Fruit', abv: 0, isAlcoholic: false },
        { name: 'Orange',     type: 'Fresh Produce', sub: 'Citrus Fruit', abv: 0, isAlcoholic: false },
        { name: 'Mint',       type: 'Fresh Produce', sub: 'Herb',         abv: 0, isAlcoholic: false },

        { name: 'Ice Cubes',        type: 'Other', sub: 'Ice',                  abv: 0, isAlcoholic: false },
        { name: 'Coconut Milk',     type: 'Other', sub: 'Coconut Milk / Cream', abv: 0, isAlcoholic: false },

        { name: 'Triple Sec',       type: 'Liqueur', sub: 'Orange / Citrus Liqueur', abv: 30, isAlcoholic: true },
        { name: 'Cointreau',        type: 'Liqueur', sub: 'Orange / Citrus Liqueur', abv: 40, isAlcoholic: true },

        { name: 'Egg',              type: "Dairy & Egg", sub: 'Whole Egg', abv: 0, isAlcoholic: false },

        // ── DERIVED INGREDIENTS ─────────────────────────────────────────────
        { name: 'Lemon Juice',      type: 'Juice', sub: 'Citrus Juice', abv: 0, isAlcoholic: false },
        { name: 'Lime Juice',       type: 'Juice', sub: 'Citrus Juice', abv: 0, isAlcoholic: false },
        { name: 'Orange Juice',     type: 'Juice', sub: 'Citrus Juice', abv: 0, isAlcoholic: false },

        { name: 'Fresh Lemon Juice',      type: 'Juice', sub: 'Citrus Juice', abv: 0, isAlcoholic: false },
        { name: 'Fresh Lime Juice',       type: 'Juice', sub: 'Citrus Juice', abv: 0, isAlcoholic: false },

        { name: 'Lemon Peel',      type: 'Garnish', sub: 'Citrus Twist / Peel', abv: 0, isAlcoholic: false },
        { name: 'Orange Peel',      type: 'Garnish', sub: 'Citrus Twist / Peel', abv: 0, isAlcoholic: false },

        { name: 'Lime Wedge',       type: 'Garnish', sub: 'Citrus Wedge', abv: 0, isAlcoholic: false },
        { name: 'Orange Slice',     type: 'Garnish', sub: 'Citrus Wheel / Slice', abv: 0, isAlcoholic: false },

        { name: 'Mint Sprig',       type: 'Garnish', sub: 'Herb Sprig', abv: 0, isAlcoholic: false },

        { name: 'Crushed Ice',      type: 'Other', sub: 'Ice', abv: 0, isAlcoholic: false },

        { name: 'Coconut Cream',    type: 'Dairy & Egg', sub: 'Plant-Based Cream', abv: 0, isAlcoholic: false },

        { name: 'Egg White',        type: 'Dairy & Egg', sub: 'Egg White', isAlcoholic: false },
        { name: 'Egg Yolk',         type: 'Dairy & Egg', sub: 'Egg Yolk', isAlcoholic: false },
    ]

    for (const i of ingredientsData) {
        const subId = S[i.sub]
        if (!subId) {
            console.warn(`⚠ SubType not found for ingredient "${i.name}" → sub "${i.sub}"`)
            continue
        }
        await prisma.ingredient.upsert({
            where:  { name: i.name },
            update: {
                typeId:        T[i.type],
                subTypeId:     subId,
                abv:           i?.abv,
                isAlcoholic:   i.isAlcoholic,
                imageUrl:      i.imageUrl ?? null,
            },
            create: {
                name:          i.name,
                typeId:        T[i.type],
                subTypeId:     subId,
                abv:           i?.abv,
                isAlcoholic:   i.isAlcoholic,
                imageUrl:      i.imageUrl ?? null,
            },
        })
    }

    const dbIngredients = await prisma.ingredient.findMany()
    const I = Object.fromEntries(dbIngredients.map((i: { name: string; id: string }) => [i.name, i.id]))

    /* ─── INGREDIENT DERIVATIONS ──────────────────────────────────────────── */
    // Maps base (fresh produce) → derived product (juice, zest, etc.)
    const derivations: {
        base: string
        derived: string
        yieldAmount: number
        yieldUnit: 'cl' | 'ml' | 'oz' | 'pcs' | 'zest'
        requiresTool?: string
    }[] = [
        // Citrus → Juice
        { base: 'Lemon',  derived: 'Lemon Juice',      yieldAmount: 3,   yieldUnit: 'cl', requiresTool: 'Citrus Juicer'},
        { base: 'Lime',   derived: 'Lime Juice',       yieldAmount: 2.5, yieldUnit: 'cl', requiresTool: 'Citrus Juicer'},
        { base: 'Lemon', derived: 'Fresh Lemon Juice', yieldAmount: 3, yieldUnit: 'cl', requiresTool: 'Citrus Juicer' },
        { base: 'Lime',  derived: 'Fresh Lime Juice',  yieldAmount: 2.5, yieldUnit: 'cl', requiresTool: 'Citrus Juicer' },

        // Lemon juice equivalence
        { base: 'Lemon Juice',       derived: 'Fresh Lemon Juice', yieldAmount: 1, yieldUnit: 'cl' },
        { base: 'Fresh Lemon Juice', derived: 'Lemon Juice',       yieldAmount: 1, yieldUnit: 'cl' },

        // Lime juice equivalence
        { base: 'Lime Juice',        derived: 'Fresh Lime Juice',  yieldAmount: 1, yieldUnit: 'cl' },
        { base: 'Fresh Lime Juice',  derived: 'Lime Juice',        yieldAmount: 1, yieldUnit: 'cl' },


        { base: 'Orange', derived: 'Orange Juice',     yieldAmount: 8,   yieldUnit: 'cl', requiresTool: 'Citrus Juicer'},

        // Citrus → Zest / Peel
        { base: 'Lemon',  derived: 'Lemon Peel',  yieldAmount: 2, yieldUnit: 'zest', requiresTool: 'Peeler' },
        { base: 'Orange', derived: 'Orange Peel',  yieldAmount: 2, yieldUnit: 'zest', requiresTool: 'Peeler' },

        // Citrus → Garnish
        { base: 'Lime',   derived: 'Lime Wedge',   yieldAmount: 6, yieldUnit: 'pcs' },
        { base: 'Orange', derived: 'Orange Slice', yieldAmount: 6, yieldUnit: 'pcs' },

        { base: 'Mint', derived: 'Mint Sprig', yieldAmount: 3, yieldUnit: 'pcs' },

        { base: 'Ice Cubes', derived: 'Crushed Ice', yieldAmount: 1, yieldUnit: 'pcs', requiresTool: 'Lewis Bag' },

        { base: 'Coconut Milk', derived: 'Coconut Cream', yieldAmount: 0.7, yieldUnit: 'cl' },

        { base: 'Triple Sec', derived: 'Cointreau', yieldAmount: 1, yieldUnit: 'cl' },
        { base: 'Cointreau', derived: 'Triple Sec', yieldAmount: 1, yieldUnit: 'cl' },

        // Egg → Egg White / Yolk
        { base: 'Egg', derived: 'Egg White', yieldAmount: 30,  yieldUnit: 'ml' },
        { base: 'Egg', derived: 'Egg Yolk',  yieldAmount: 1, yieldUnit: 'pcs' },
    ]

    for (const d of derivations) {
        const baseId = I[d.base]
        const derivedId = I[d.derived]
        if (!baseId || !derivedId) {
            console.warn(`⚠ Derivation skipped: ${d.base} → ${d.derived} (ingredient not found)`)
            continue
        }
        await prisma.ingredientDerivative.upsert({
            where: { baseIngredientId_derivedId: { baseIngredientId: baseId, derivedId } },
            create: {
                baseIngredientId: baseId,
                derivedId,
                yieldAmount: d.yieldAmount,
                yieldUnit: d.yieldUnit,
                requiresTool: d.requiresTool ?? null,
            },
            update: {
                yieldAmount: d.yieldAmount,
                yieldUnit: d.yieldUnit,
                requiresTool: d.requiresTool ?? null,
            },
        })
    }

    console.log(`✓ Seeded ${ingredientsData.length} ingredients, ${glasses.length} glasses, ${derivations.length} derivations`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
