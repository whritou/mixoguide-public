import type { ComponentType } from 'react'
import {
    Utensils, Blend, KeyRound, Scissors, Droplets, Cog, Filter, Shovel, Ruler,
    Hammer, Layers, Wine, Leaf, FlaskConical, Flame, Zap, RotateCcw, Boxes,
    Wind, CloudSnow, Waves, Sparkles,
} from 'lucide-react'

type IconComponent = ComponentType<{ size?: number; className?: string }>

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export type BarTool = {
    name: string
    alsoKnownAs?: string
    icon: IconComponent
    description: string
    tips: string[]
}

export type Technique = {
    name: string
    slug: string
    difficulty: Difficulty
    usedFor: string
    icon: IconComponent
    description: string
    tips: string[]
}

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
    Beginner:     'bg-emerald-50 text-emerald-700',
    Intermediate: 'bg-amber-50 text-amber-700',
    Advanced:     'bg-rose-50 text-rose-700',
}

export const cardVariants = {
    hidden:  { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const } },
}

export const containerVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.08 } },
}

export const BAR_TOOLS: BarTool[] = [
    {
        name: "Bar Spoon",
        icon: Utensils,
        description:
            "A long-handled spoon (~30 cm) with a twisted stem used for stirring cocktails and building layered drinks. The twisted handle guides liquids smoothly and helps float ingredients precisely when layering.",
        tips: [
            "Use a circular wrist motion — not a figure-eight — for smooth, clean stirring.",
            "Rest the spoon against the inside wall of the glass to reduce turbulence.",
            "The back of the bowl floats lighter ingredients when layering.",
            "Holds roughly 5 ml (1 tsp) — handy for measuring small quantities.",
        ],
    },
    {
        name: "Blender",
        icon: Blend,
        description:
            "A high-powered blender is essential for frozen cocktails and any drink requiring ice to be fully incorporated. Pulse carefully — over-blending melts the ice too quickly and waters down the drink.",
        tips: [
            "Start on a lower speed and increase gradually to avoid air pockets.",
            "Use crushed ice rather than cubed for a smoother, more even blend.",
            "Frozen fruit gives body and chill without needing as much ice.",
            "A brief pulse at the end breaks up any remaining chunks without over-diluting.",
        ],
    },
    {
        name: "Bottle Opener",
        alsoKnownAs: "Bar Key / Speed Opener",
        icon: KeyRound,
        description:
            "The most-reached-for tool behind any bar. A speed opener (churchkey) opens both crown caps and pulls pull-tabs in a single motion. Keeping one on your person during service is non-negotiable.",
        tips: [
            "Hook the lip under the cap edge and lever forward in one confident motion.",
            "Keep a spare — bottle openers walk off more than any other tool.",
            "A quality opener with a comfortable grip saves strain during high-volume service.",
            "The flat end doubles as a box opener or foil cutter in a pinch.",
        ],
    },
    {
        name: "Channel Knife",
        alsoKnownAs: "Citrus Zester",
        icon: Scissors,
        description:
            "Creates long, elegant spiral citrus twists for garnish. The small V-shaped blade digs into the peel and pulls a thin ribbon of zest as you rotate the fruit — the twist is then curled around a straw or dropped into the glass.",
        tips: [
            "Use firm, even pressure from the top of the fruit to the bottom in one continuous pull.",
            "Practice on a chilled fruit — the peel is firmer and easier to control.",
            "Twist the ribbon around a chopstick or bar spoon handle to coil it tightly.",
            "Express the peel over the drink before placing it to release the aromatic oils.",
        ],
    },
    {
        name: "Citrus Juicer",
        alsoKnownAs: "Mexican Elbow / Press Juicer",
        icon: Droplets,
        description:
            "A hinged hand press that extracts maximum juice from citrus halves quickly. Fresh juice is non-negotiable for balanced cocktails — bottled juice lacks the volatile aromatic compounds that make citrus shine.",
        tips: [
            "Roll the fruit firmly on the counter before cutting to break down the membranes.",
            "Press with the cut side facing down toward the holes for better yield.",
            "Use juice within 8 hours — citrus oxidizes fast and loses brightness.",
            "Strain seeds with a small mesh strainer or use a juicer with a built-in filter.",
        ],
    },
    {
        name: "Corkscrew",
        alsoKnownAs: "Wine Key / Waiter's Friend",
        icon: Cog,
        description:
            "The waiter's friend is the bartender's standard: a folding tool with a worm screw, a hinged fulcrum, and a foil cutter all in one. Mastering the two-step lever technique produces a clean, silent pull every time.",
        tips: [
            "Score the foil just below the second lip of the neck for a clean removal.",
            "Insert the worm at a slight angle then straighten as you spiral it in.",
            "Use the two-step fulcrum: first step for the bottom half, second for the top.",
            "Never pull straight up — rock the cork slightly side to side on the final extraction.",
        ],
    },
    {
        name: "Fine Strainer",
        alsoKnownAs: "Double Strainer / Tea Strainer",
        icon: Filter,
        description:
            "A small fine-mesh sieve held above the glass while pouring through a Hawthorne strainer. Catches ice chips, citrus pulp, herb fragments, and any fine particles — producing a crystal-clear, professional result.",
        tips: [
            "Hold it just above the glass rim, not inside it.",
            "Rinse immediately after use — fine mesh clogs and stains if left to dry.",
            "Essential for any cocktail with fresh citrus, muddled herbs, or egg white.",
            "A small bar-style mesh works better than a wide kitchen strainer for control.",
        ],
    },
    {
        name: "Ice Scoop",
        icon: Shovel,
        description:
            "A wide-mouthed scoop for loading glasses and shakers rapidly with ice from a bin. Hygienic, fast, and far safer than using a glass — which can chip and contaminate the ice.",
        tips: [
            "Never use a glass to scoop ice — breakage contaminates the whole bin.",
            "Hang or store the scoop outside the ice bin between uses for hygiene.",
            "A larger scoop (12 oz+) loads shakers faster during high-volume service.",
            "Rinse the scoop at the start of each shift.",
        ],
    },
    {
        name: "Jigger",
        alsoKnownAs: "Measure / Oz Cup",
        icon: Ruler,
        description:
            "A double-sided hourglass tool for measuring precise volumes. Typically 1 oz and 2 oz, though sizes vary widely. Precision here is the difference between a balanced cocktail and one that is off-kilter.",
        tips: [
            "Always measure at eye level to avoid parallax errors.",
            "Fill to the very rim — surface tension holds the last drop.",
            "Japanese-style jiggers with straight walls are easier to read precisely.",
            "Rinse between very different ingredients to avoid cross-contamination.",
        ],
    },
    {
        name: "Lewis Bag",
        alsoKnownAs: "Ice Bag / Canvas Bag",
        icon: Wind,
        description:
            "A heavy canvas bag used with a wooden mallet to crush ice into fine, fluffy chips. Lewis bag ice chills drinks faster than cubed ice and creates the distinctive texture of Juleps, Swizzles, and Tiki drinks.",
        tips: [
            "Use a wooden mallet — metal hammers tear the canvas fibers over time.",
            "Fold the top twice before striking to prevent ice from flying out.",
            "Work quickly: the bag absorbs water, keeping the crushed ice drier than a blender.",
            "Rinse and let the bag dry fully between uses to prevent mildew.",
        ],
    },
    {
        name: "Mixing Glass",
        alsoKnownAs: "Yarai Glass",
        icon: Wine,
        description:
            "A heavy, thick-walled glass vessel for stirring spirit-forward cocktails. The weight insulates temperature and the transparency lets you watch dilution happen in real time.",
        tips: [
            "Pre-chill with ice water for 30 seconds, then discard before adding ingredients.",
            "Stir 30-40 full rotations for proper chilling and dilution (30-45 seconds).",
            "Use large cubed ice — it chills without over-diluting.",
            "A seamless design with no pour notch allows a full, uninterrupted stir.",
        ],
    },
    {
        name: "Muddler",
        icon: Hammer,
        description:
            "A blunt pestle-like tool used to press and crush fresh fruits, herbs, and sugar directly in the glass or shaker. Releases essential oils from herbs and juice from citrus without turning them to pulp.",
        tips: [
            "Use firm, steady downward pressure — not aggressive grinding.",
            "Never over-muddle mint: more than 4-5 presses releases bitter chlorophyll.",
            "Add a pinch of sugar when muddling herbs to act as a gentle abrasive.",
            "Avoid wooden muddlers with acidic citrus — they absorb flavor and degrade.",
        ],
    },
    {
        name: "Peeler",
        alsoKnownAs: "Y-Peeler / Vegetable Peeler",
        icon: Leaf,
        description:
            "A Y-peeler produces wide, flat citrus discs ideal for expressing essential oils over a cocktail. The broad surface area releases far more aromatic oil than a channel knife twist.",
        tips: [
            "Use firm, even strokes to remove peel without the bitter white pith.",
            "Express the peel by flexing it skin-side-out over the drink, then discard or use as garnish.",
            "Run the peel around the glass rim before dropping it in for an extra aromatic layer.",
            "Freshly cut peels lose their oils within minutes — prep just before serving.",
        ],
    },
    {
        name: "Shaker",
        alsoKnownAs: "Boston Shaker / Cobbler Shaker",
        icon: FlaskConical,
        description:
            "The workhorse of the bar. A Boston shaker (two-piece tin) is preferred by professionals for speed and control. A cobbler (three-piece with built-in strainer) is more beginner-friendly. Both chill, dilute, and aerate simultaneously.",
        tips: [
            "Tap the side firmly to create an airtight seal on a Boston shaker before shaking.",
            "Hold one piece in each hand at opposite ends — never cradle the middle.",
            "Strike the bottom corner with your palm to break the seal after shaking.",
            "Chill your tin before service for faster, more consistent temperature drops.",
        ],
    },
    {
        name: "Strainer",
        alsoKnownAs: "Hawthorne Strainer",
        icon: Filter,
        description:
            "The most universal cocktail strainer — a flat disc with a coiled spring around the rim. The spring traps ice and solids while liquid flows through cleanly. Pairs with a fine strainer for a double-strain.",
        tips: [
            "Adjust the coil tightness with your fingers to control the flow speed.",
            "Hold it at a slight angle to slow the pour and reduce splashing.",
            "The spring should sit flush against the inside of the tin for a proper seal.",
            "Combine with a fine mesh strainer for perfectly clear, silky results.",
        ],
    },
    {
        name: "Torch",
        alsoKnownAs: "Culinary Torch / Butane Torch",
        icon: Flame,
        description:
            "A small butane torch used for caramelizing garnishes, toasting spices, flaming citrus peels, and adding theatrical smoke elements. The concentrated, controlled flame far exceeds what a match or lighter can achieve.",
        tips: [
            "Keep the flame moving — holding it still in one spot scorches rather than caramelizes.",
            "Toast spices in a spoon held near (not in) the flame to release aromatics without burning.",
            "Use a torch to char a cinnamon stick for smoke-infused garnishes.",
            "Always cool torched garnishes briefly before placing them on or in the drink.",
        ],
    },
]

export const TECHNIQUES: Technique[] = [
    {
        name: "Shaken",
        slug: "shaken",
        difficulty: "Beginner",
        usedFor: "Daiquiri, Margarita, Whiskey Sour, Cosmopolitan",
        icon: Zap,
        description:
            "Combining ingredients with ice in a shaker and shaking vigorously to simultaneously chill, dilute, and aerate. The result is a slightly cloudy, textured drink with fine ice crystals that give sour-style cocktails their signature frothy body and brightness.",
        tips: [
            "Shake hard for 10-15 seconds with full arm extension — wrist flicks will not cut it.",
            "Listen for the ice to slow and rattle — that is the sign it is properly chilled.",
            "Use whenever a drink contains citrus juice, dairy, egg, or other emulsifiable ingredients.",
            "Double-strain into the glass to remove ice chips and pulp for a clean finish.",
        ],
    },
    {
        name: "Stirred",
        slug: "stirred",
        difficulty: "Beginner",
        usedFor: "Martini, Manhattan, Negroni, Old Fashioned, Vieux Carré",
        icon: RotateCcw,
        description:
            "Gently combining ingredients in a mixing glass using a bar spoon. Stirring chills and dilutes without aeration, preserving the silky clarity and texture of spirit-forward cocktails that would be muddied by shaking.",
        tips: [
            "Stir 30-40 full rotations — roughly 30 to 45 seconds for proper dilution.",
            "Use a smooth wrist-led circular motion, keeping the spoon against the glass wall.",
            "Pre-chill the mixing glass with ice water for a colder, crisper result.",
            "Taste as you stir — the drink is ready when the spirit edge softens.",
        ],
    },
    {
        name: "Built",
        slug: "built",
        difficulty: "Beginner",
        usedFor: "Gin & Tonic, Mojito, Aperol Spritz, Moscow Mule",
        icon: Boxes,
        description:
            "Assembling the cocktail directly in the serving glass without a shaker or mixing glass. Ingredients are added in order — typically spirit first, then modifiers, then carbonated mixers last — and lightly stirred to integrate without destroying carbonation.",
        tips: [
            "Add carbonated ingredients last and stir gently — two or three slow lifts from the bottom.",
            "Use plenty of ice before pouring to pre-chill the glass and slow dilution.",
            "The order of ingredients matters: spirit before mixer ensures even flavor distribution.",
            "A chilled glass is especially important for built drinks as there is no shaking to compensate.",
        ],
    },
    {
        name: "Layered",
        slug: "layered",
        difficulty: "Intermediate",
        usedFor: "B-52, Pousse-Café, Black and Tan, Tequila Sunrise",
        icon: Layers,
        description:
            "Carefully pouring ingredients so they sit in distinct visual strata. Each layer floats on the one below because of density differences — denser (more sugary) liquids sink while lighter ones float. Temperature also plays a subtle role.",
        tips: [
            "Start with the heaviest, most sugary ingredient at the bottom.",
            "Pour slowly over the back of a bar spoon resting lightly against the glass wall.",
            "Chill denser liqueurs beforehand — cold liquid is marginally denser and more stable.",
            "Never let the spoon touch the layer below when adding a new pour.",
        ],
    },
    {
        name: "Blended",
        slug: "blended",
        difficulty: "Beginner",
        usedFor: "Frozen Daiquiri, Piña Colada, Frozen Margarita, Frosé",
        icon: Blend,
        description:
            "Processing cocktail ingredients with ice in a high-powered blender until smooth. The goal is a uniform, creamy consistency with no visible ice chunks — cold enough to be refreshing but thick enough to hold its shape in the glass.",
        tips: [
            "Use crushed or pellet ice rather than cubed for a smoother, quicker blend.",
            "Frozen fruit adds body and chill without extra ice dilution.",
            "Pulse in short bursts to check consistency — over-blending thins the drink.",
            "Chill the glass in the freezer beforehand so the drink stays cold longer.",
        ],
    },
    {
        name: "Flamed",
        slug: "flamed",
        difficulty: "Intermediate",
        usedFor: "Flamed Orange Martini, Brandy Crusta, Café Brûlot, Flaming Dr. Pepper",
        icon: Flame,
        description:
            "Igniting high-proof spirit or expressing a citrus peel through an open flame to caramelize the oils or burn off harsh alcohol, adding dramatic visual flair and a subtly warm, smoky aromatic note to the finished drink.",
        tips: [
            "Only high-proof spirits (above 40% ABV) ignite reliably — avoid low-proof liqueurs.",
            "Warm the peel near the flame for a few seconds before expressing to maximize oil release.",
            "Keep the flame low and controlled — a dramatic effect should never be unsafe.",
            "Always have the drink ready before igniting; never leave a flame unattended at the bar.",
        ],
    },
    {
        name: "Infused",
        slug: "infused",
        difficulty: "Intermediate",
        usedFor: "Infused spirits, cordials, syrups, fat-washed cocktails",
        icon: CloudSnow,
        description:
            "Steeping herbs, spices, fruits, or other aromatics in spirit or syrup over time to extract their flavor compounds. Cold infusion preserves delicate aromatics; heat infusion (fat-washing included) extracts heavier, richer flavors more quickly.",
        tips: [
            "Taste every few hours — over-infusion turns delicate herbs bitter.",
            "Cold-infuse fragile botanicals (cucumber, lavender); use heat for tougher spices (cinnamon, star anise).",
            "Fat-washing: combine melted fat with spirit, freeze, then skim the solidified fat for a silky, savory flavor.",
            "Label and date your infusions — the fridge extends life by days, not indefinitely.",
        ],
    },
    {
        name: "Clarified",
        slug: "clarified",
        difficulty: "Advanced",
        usedFor: "Clarified Milk Punch, Crystal Negroni, Clarified Bloody Mary",
        icon: Sparkles,
        description:
            "Using a fining agent — most commonly whole milk — to strip color, tannins, and cloudiness from a cocktail while leaving its flavor largely intact. The milk proteins bind with tannins and particles; straining removes them, leaving a crystal-clear liquid.",
        tips: [
            "Add room-temperature citrus before the milk to cause clean, compact curdling.",
            "Stir gently when adding milk — aggressive mixing produces finer curds that clog the filter.",
            "Strain through a coffee filter or Superbag for the clearest result — patience pays off.",
            "Clarified cocktails are shelf-stable for weeks in the fridge; label them with the date.",
        ],
    },
    {
        name: "Muddled",
        slug: "muddled",
        difficulty: "Beginner",
        usedFor: "Mojito, Caipirinha, Smash cocktails, Old Fashioned with fresh fruit",
        icon: Hammer,
        description:
            "Pressing and twisting fresh fruits, herbs, or other aromatics at the base of a glass or shaker to extract their flavor. Citrus releases juice, herbs release essential oils, and a pinch of sugar acts as an abrasive to maximize extraction without pulverizing the plant matter.",
        tips: [
            "With mint: 3-4 light presses only — more releases bitter chlorophyll.",
            "Muddle citrus wedges (not just the peel) to extract both juice and oils.",
            "Always muddle before adding ice so cold does not suppress extraction.",
            "Use a flat-bottomed muddler for herbs; a toothed one for firmer fruits.",
        ],
    },
    {
        name: "Smoked",
        slug: "smoked",
        difficulty: "Advanced",
        usedFor: "Smoked Old Fashioned, Smoked Mezcal Negroni, Smoked Bloody Mary",
        icon: Waves,
        description:
            "Introducing wood smoke to a cocktail glass, cloche, or the drink itself to infuse a rich, campfire-like aromatic before the first sip. The smoke does not just add flavor — it transforms the sensory experience, making the cocktail more complex and evocative.",
        tips: [
            "Use a smoking gun or torch with wood chips — hickory, cherry, and apple wood pair best with spirits.",
            "Smoke the glass, not the drink: fill with smoke, cover with a coaster for 20-30 seconds, then build the cocktail inside.",
            "Do not over-smoke — a suggestion of smoke is elegant; too much is off-putting.",
            "Pair smoked technique with spirits that already have smoky notes (Mezcal, Islay Scotch) for harmony.",
        ],
    },
]
