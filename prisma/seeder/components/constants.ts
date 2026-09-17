
/**
 * Maps CocktailDB ingredient names/types to existing seed.ts subtypes.
 * Order matters: more specific (multi-keyword) entries MUST come before generic ones.
 *
 * Critical ordering rules:
 *  - ginger* entries BEFORE 'gin' (substring collision)
 *  - root beer BEFORE 'beer'
 *  - 'maraschino cherry' BEFORE 'cherry'
 *  - 'iced tea', 'allspice' BEFORE 'ice'
 *  - compound brandy entries (apricot brandy, etc.) BEFORE plain 'brandy'
 *  - garnish peel/wedge entries BEFORE plain fruit entries
 *  - 'butterscotch' BEFORE 'scotch'
 */
export const INGREDIENT_SUBTYPE_KEYWORDS: { keywords: string[]; subType: string; type: string }[] = [

    // ── Spirits: Vodka ────────────────────────────────────────────────────────
    { keywords: ['vodka', 'flavou'],    subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'flavor'],    subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'citrus'],    subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'vanilla'],   subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'raspberry'], subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'peach'],     subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'lime'],      subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'cranberry'], subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'blackcurrant'], subType: 'Flavoured Vodka', type: 'Spirit' },
    { keywords: ['vodka', 'currant'],   subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'pepper'],    subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'citron'],    subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'kurant'],    subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka', 'peppar'],    subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['peach vodka'],        subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['raspberry vodka'],    subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['cranberry vodka'],    subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['lime vodka'],         subType: 'Flavoured Vodka',    type: 'Spirit' },
    { keywords: ['vodka'],              subType: 'Unflavoured Vodka',  type: 'Spirit' },

    // ── Spirits: Gin — ginger* MUST precede 'gin' to avoid substring match ─────
    { keywords: ['ginger', 'syrup'],  subType: 'Simple Syrup (1:1)', type: 'Sweetener' },
    { keywords: ['ginger beer'],      subType: 'Ginger Beer',        type: 'Beer & Cider' },
    { keywords: ['ginger ale'],       subType: 'Ginger Ale',         type: 'Carbonated Mixer' },
    { keywords: ['ginger'],           subType: 'Spice / Root',       type: 'Fresh Produce' },
    { keywords: ['sloe', 'gin'],      subType: 'Sloe Gin',           type: 'Spirit' },
    { keywords: ['gin'],              subType: 'London Dry Gin',     type: 'Spirit' },

    // ── Spirits: Rum ──────────────────────────────────────────────────────────
    { keywords: ['rum', 'dark'],       subType: 'Dark / Aged Rum',    type: 'Spirit' },
    { keywords: ['rum', 'aged'],       subType: 'Dark / Aged Rum',    type: 'Spirit' },
    { keywords: ['rum', 'gold'],       subType: 'Dark / Aged Rum',    type: 'Spirit' },
    { keywords: ['rum', 'añejo'],      subType: 'Dark / Aged Rum',    type: 'Spirit' },
    { keywords: ['rum', 'anejo'],      subType: 'Dark / Aged Rum',    type: 'Spirit' },
    { keywords: ['rum', 'blackstrap'], subType: 'Dark / Aged Rum',    type: 'Spirit' },
    { keywords: ['rum', 'white'],      subType: 'White / Silver Rum', type: 'Spirit' },
    { keywords: ['rum', 'light'],      subType: 'White / Silver Rum', type: 'Spirit' },
    { keywords: ['rum', 'silver'],     subType: 'White / Silver Rum', type: 'Spirit' },
    { keywords: ['rum', 'spiced'],     subType: 'Spiced Rum',         type: 'Spirit' },
    { keywords: ['rum', 'coconut'],    subType: 'Spiced Rum',         type: 'Spirit' },
    { keywords: ['malibu'],            subType: 'Spiced Rum',         type: 'Spirit' },
    { keywords: ['rum', 'overproof'],  subType: 'Overproof Rum',      type: 'Spirit' },
    { keywords: ['rum', '151'],        subType: 'Overproof Rum',      type: 'Spirit' },
    { keywords: ['bacardi limon'],     subType: 'White / Silver Rum', type: 'Spirit' },
    { keywords: ['rum'],               subType: 'White / Silver Rum', type: 'Spirit' },

    // ── Spirits: Tequila & Mezcal ─────────────────────────────────────────────
    { keywords: ['tequila', 'blanco'],  subType: 'Blanco Tequila',   type: 'Spirit' },
    { keywords: ['tequila', 'silver'],  subType: 'Blanco Tequila',   type: 'Spirit' },
    { keywords: ['tequila', 'reposado'],subType: 'Reposado Tequila', type: 'Spirit' },
    { keywords: ['tequila', 'anejo'],   subType: 'Añejo Tequila',    type: 'Spirit' },
    { keywords: ['tequila', 'añejo'],   subType: 'Añejo Tequila',    type: 'Spirit' },
    { keywords: ['tequila'],            subType: 'Blanco Tequila',   type: 'Spirit' },
    { keywords: ['mezcal'],             subType: 'Mezcal',           type: 'Spirit' },

    // ── Spirits: Whiskey ── brand names first, then generics ─────────────────
    { keywords: ['wild turkey'],        subType: 'Bourbon Whiskey', type: 'Spirit' },
    { keywords: ['jack daniels'],       subType: 'Bourbon Whiskey', type: 'Spirit' },
    { keywords: ['jim beam'],           subType: 'Bourbon Whiskey', type: 'Spirit' },
    { keywords: ['crown royal'],        subType: 'Rye Whiskey',     type: 'Spirit' },
    { keywords: ['tennessee whiskey'],  subType: 'Bourbon Whiskey', type: 'Spirit' },
    { keywords: ['bourbon'],            subType: 'Bourbon Whiskey', type: 'Spirit' },
    { keywords: ['rye', 'whiskey'],     subType: 'Rye Whiskey',     type: 'Spirit' },
    { keywords: ['rye', 'whisky'],      subType: 'Rye Whiskey',     type: 'Spirit' },
    { keywords: ['islay'],              subType: 'Scotch Whisky',   type: 'Spirit' },
    { keywords: ['blended scotch'],     subType: 'Scotch Whisky',   type: 'Spirit' },
    // 'butterscotch' MUST precede 'scotch' to avoid match
    { keywords: ['butterscotch'],       subType: 'Peach & Apricot Liqueur', type: 'Liqueur' },
    { keywords: ['scotch'],             subType: 'Scotch Whisky',   type: 'Spirit' },
    { keywords: ['irish', 'whiskey'],   subType: 'Irish Whiskey',   type: 'Spirit' },
    { keywords: ['irish', 'whisky'],    subType: 'Irish Whiskey',   type: 'Spirit' },
    { keywords: ['japanese', 'whisky'], subType: 'Japanese Whisky', type: 'Spirit' },
    { keywords: ['blended', 'whiskey'], subType: 'Bourbon Whiskey', type: 'Spirit' },
    { keywords: ['whiskey'],            subType: 'Bourbon Whiskey', type: 'Spirit' },
    { keywords: ['whisky'],             subType: 'Scotch Whisky',   type: 'Spirit' },

    // ── Spirits: Brandy, Cognac & Other ───────────────────────────────────────
    { keywords: ['cognac'],             subType: 'Brandy / Cognac',    type: 'Spirit' },
    // compound brandy entries BEFORE plain 'brandy'
    { keywords: ['apple', 'brandy'],    subType: 'Brandy / Cognac',    type: 'Spirit' },
    { keywords: ['peach', 'brandy'],    subType: 'Brandy / Cognac',    type: 'Spirit' },
    { keywords: ['blackberry', 'brandy'],subType: 'Brandy / Cognac',   type: 'Spirit' },
    { keywords: ['cherry', 'brandy'],   subType: 'Brandy / Cognac',    type: 'Spirit' },
    { keywords: ['coffee', 'brandy'],   subType: 'Brandy / Cognac',    type: 'Spirit' },
    { keywords: ['brandy'],             subType: 'Brandy / Cognac',    type: 'Spirit' },
    { keywords: ['armagnac'],           subType: 'Armagnac',            type: 'Spirit' },
    { keywords: ['applejack'],          subType: 'Brandy / Cognac',    type: 'Spirit' },
    { keywords: ['apfelkorn'],          subType: 'Brandy / Cognac',    type: 'Spirit' },
    { keywords: ['pisco'],              subType: 'Pisco',               type: 'Spirit' },
    { keywords: ['cachaca'],            subType: 'Cachaça',             type: 'Spirit' },
    { keywords: ['cachaça'],            subType: 'Cachaça',             type: 'Spirit' },
    { keywords: ['grain alcohol'],      subType: 'Unflavoured Vodka',  type: 'Spirit' },
    { keywords: ['absinthe'],           subType: 'Absinthe / Pastis',  type: 'Spirit' },
    { keywords: ['pastis'],             subType: 'Absinthe / Pastis',  type: 'Spirit' },
    { keywords: ['ouzo'],               subType: 'Absinthe / Pastis',  type: 'Spirit' },
    { keywords: ['ricard'],             subType: 'Absinthe / Pastis',  type: 'Spirit' },
    { keywords: ['pernod'],             subType: 'Absinthe / Pastis',  type: 'Spirit' },
    { keywords: ['aquavit'],            subType: 'Aquavit',             type: 'Spirit' },
    { keywords: ['grappa'],             subType: 'Grappa',              type: 'Spirit' },
    { keywords: ['soju'],               subType: 'Soju',                type: 'Spirit' },
    { keywords: ['baijiu'],             subType: 'Baijiu',              type: 'Spirit' },
    { keywords: ['everclear'],          subType: 'Unflavoured Vodka',  type: 'Spirit' },
    { keywords: ['firewater'],          subType: 'Unflavoured Vodka',  type: 'Spirit' },

    // ── Liqueurs: Orange / Citrus ─────────────────────────────────────────────
    { keywords: ['triple sec'],   subType: 'Orange / Citrus Liqueur', type: 'Liqueur' },
    { keywords: ['cointreau'],    subType: 'Orange / Citrus Liqueur', type: 'Liqueur' },
    { keywords: ['grand marnier'],subType: 'Orange / Citrus Liqueur', type: 'Liqueur' },
    { keywords: ['curacao'],      subType: 'Orange / Citrus Liqueur', type: 'Liqueur' },
    { keywords: ['curaçao'],      subType: 'Orange / Citrus Liqueur', type: 'Liqueur' },
    { keywords: ['limoncello'],   subType: 'Orange / Citrus Liqueur', type: 'Liqueur' },

    // ── Liqueurs: Coffee ──────────────────────────────────────────────────────
    { keywords: ['kahlua'],          subType: 'Coffee Liqueur', type: 'Liqueur' },
    { keywords: ['kahlúa'],          subType: 'Coffee Liqueur', type: 'Liqueur' },
    { keywords: ['tia maria'],       subType: 'Coffee Liqueur', type: 'Liqueur' },
    { keywords: ['coffee', 'liqueur'],subType: 'Coffee Liqueur', type: 'Liqueur' },

    // ── Liqueurs: Nut & Almond ────────────────────────────────────────────────
    { keywords: ['amaretto'],   subType: 'Nut & Almond Liqueur', type: 'Liqueur' },
    { keywords: ['disaronno'],  subType: 'Nut & Almond Liqueur', type: 'Liqueur' },
    { keywords: ['frangelico'], subType: 'Nut & Almond Liqueur', type: 'Liqueur' },

    // ── Liqueurs: Herbal & Botanical ──────────────────────────────────────────
    { keywords: ['chartreuse'],     subType: 'Herbal & Botanical Liqueur', type: 'Liqueur' },
    { keywords: ['benedictine'],    subType: 'Herbal & Botanical Liqueur', type: 'Liqueur' },
    { keywords: ['galliano'],       subType: 'Herbal & Botanical Liqueur', type: 'Liqueur' },
    { keywords: ['drambuie'],       subType: 'Herbal & Botanical Liqueur', type: 'Liqueur' },
    { keywords: ['jagermeister'],   subType: 'Herbal & Botanical Liqueur', type: 'Liqueur' },
    { keywords: ['jägermeister'],   subType: 'Herbal & Botanical Liqueur', type: 'Liqueur' },
    { keywords: ['goldschlager'],   subType: 'Herbal & Botanical Liqueur', type: 'Liqueur' },
    { keywords: ['hot damn'],       subType: 'Herbal & Botanical Liqueur', type: 'Liqueur' },
    { keywords: ['yukon jack'],     subType: 'Herbal & Botanical Liqueur', type: 'Liqueur' },
    { keywords: ['southern comfort'],subType: 'Peach & Apricot Liqueur',  type: 'Liqueur' },

    // ── Liqueurs: Cream ───────────────────────────────────────────────────────
    { keywords: ['baileys'],         subType: 'Cream Liqueur', type: 'Liqueur' },
    { keywords: ['irish cream'],     subType: 'Cream Liqueur', type: 'Liqueur' },
    { keywords: ['cream', 'liqueur'],subType: 'Cream Liqueur', type: 'Liqueur' },
    { keywords: ['advocaat'],        subType: 'Cream Liqueur', type: 'Liqueur' },

    // ── Liqueurs: Berry & Fruit ───────────────────────────────────────────────
    { keywords: ['chambord'],                   subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['raspberry', 'liqueur'],       subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['strawberry', 'schnapps'],     subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['strawberry', 'liqueur'],      subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['kiwi', 'liqueur'],            subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['blackcurrant', 'liqueur'],    subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['blackcurrant', 'cordial'],    subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['creme de cassis'],            subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['crème de cassis'],            subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['creme de mure'],              subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['crème de mûre'],              subType: 'Berry & Fruit Liqueur',   type: 'Liqueur' },
    { keywords: ['pisang ambon'],               subType: 'Tropical Fruit Liqueur',  type: 'Liqueur' },
    { keywords: ['creme de banane'],            subType: 'Tropical Fruit Liqueur',  type: 'Liqueur' },
    { keywords: ['crème de banane'],            subType: 'Tropical Fruit Liqueur',  type: 'Liqueur' },
    { keywords: ['banana', 'liqueur'],          subType: 'Tropical Fruit Liqueur',  type: 'Liqueur' },
    { keywords: ['coconut', 'liqueur'],         subType: 'Tropical Fruit Liqueur',  type: 'Liqueur' },
    { keywords: ['passoa'],                     subType: 'Tropical Fruit Liqueur',  type: 'Liqueur' },

    // ── Liqueurs: Elderflower ─────────────────────────────────────────────────
    { keywords: ['elderflower', 'cordial'], subType: 'Elderflower Liqueur', type: 'Liqueur' },
    { keywords: ['elderflower'],            subType: 'Elderflower Liqueur', type: 'Liqueur' },
    { keywords: ['st-germain'],             subType: 'Elderflower Liqueur', type: 'Liqueur' },
    { keywords: ['st germain'],             subType: 'Elderflower Liqueur', type: 'Liqueur' },
    { keywords: ['germain'],                subType: 'Elderflower Liqueur', type: 'Liqueur' },

    // ── Liqueurs: Aperitivo & Amaro ───────────────────────────────────────────
    { keywords: ['campari'], subType: 'Aperitivo (Bitter)', type: 'Liqueur' },
    { keywords: ['aperol'],  subType: 'Aperitivo (Bitter)', type: 'Liqueur' },
    { keywords: ['cynar'],   subType: 'Amaro',              type: 'Liqueur' },
    { keywords: ['amaro'],   subType: 'Amaro',              type: 'Liqueur' },
    { keywords: ['fernet'],  subType: 'Amaro',              type: 'Liqueur' },

    // ── Liqueurs: Cherry ─────────────────────────────────────────────────────
    { keywords: ['maraschino', 'liqueur'], subType: 'Cherry Liqueur', type: 'Liqueur' },
    { keywords: ['luxardo'],               subType: 'Cherry Liqueur', type: 'Liqueur' },
    { keywords: ['cherry', 'liqueur'],     subType: 'Cherry Liqueur', type: 'Liqueur' },
    { keywords: ['kirsch'],                subType: 'Cherry Liqueur', type: 'Liqueur' },
    { keywords: ['cherry heering'],        subType: 'Cherry Liqueur', type: 'Liqueur' },

    // ── Liqueurs: Peach & Apricot ─────────────────────────────────────────────
    { keywords: ['peach', 'schnapps'],  subType: 'Peach & Apricot Liqueur', type: 'Liqueur' },
    { keywords: ['peach', 'liqueur'],   subType: 'Peach & Apricot Liqueur', type: 'Liqueur' },
    { keywords: ['apricot', 'brandy'],  subType: 'Peach & Apricot Liqueur', type: 'Liqueur' },
    { keywords: ['apricot', 'liqueur'], subType: 'Peach & Apricot Liqueur', type: 'Liqueur' },
    { keywords: ['schnapps'],           subType: 'Peach & Apricot Liqueur', type: 'Liqueur' },

    // ── Liqueurs: Melon ───────────────────────────────────────────────────────
    { keywords: ['midori'],          subType: 'Melon Liqueur', type: 'Liqueur' },
    { keywords: ['melon', 'liqueur'],subType: 'Melon Liqueur', type: 'Liqueur' },

    // ── Liqueurs: Chocolate ───────────────────────────────────────────────────
    { keywords: ['creme de cacao'],       subType: 'Chocolate & Mocha Liqueur', type: 'Liqueur' },
    { keywords: ['crème de cacao'],       subType: 'Chocolate & Mocha Liqueur', type: 'Liqueur' },
    { keywords: ['chocolate', 'liqueur'], subType: 'Chocolate & Mocha Liqueur', type: 'Liqueur' },
    { keywords: ['godiva'],               subType: 'Chocolate & Mocha Liqueur', type: 'Liqueur' },

    // ── Liqueurs: Anise ───────────────────────────────────────────────────────
    { keywords: ['sambuca'],  subType: 'Anise & Sambuca', type: 'Liqueur' },
    { keywords: ['anisette'], subType: 'Anise & Sambuca', type: 'Liqueur' },
    { keywords: ['arak'],     subType: 'Anise & Sambuca', type: 'Liqueur' },

    // ── Liqueurs: Falernum ────────────────────────────────────────────────────
    { keywords: ['falernum'], subType: 'Falernum', type: 'Liqueur' },

    // ── Liqueurs: Generic catch-all ───────────────────────────────────────────
    { keywords: ['creme de'],  subType: 'Berry & Fruit Liqueur',       type: 'Liqueur' },
    { keywords: ['crème de'],  subType: 'Berry & Fruit Liqueur',       type: 'Liqueur' },
    { keywords: ['liqueur'],   subType: 'Herbal & Botanical Liqueur',  type: 'Liqueur' },

    // ── Fortified Wine ────────────────────────────────────────────────────────
    { keywords: ['vermouth', 'sweet'],  subType: 'Sweet Vermouth',            type: 'Fortified Wine' },
    { keywords: ['vermouth', 'rosso'],  subType: 'Sweet Vermouth',            type: 'Fortified Wine' },
    { keywords: ['rosso', 'vermouth'],  subType: 'Sweet Vermouth',            type: 'Fortified Wine' },
    { keywords: ['vermouth', 'dry'],    subType: 'Dry Vermouth',              type: 'Fortified Wine' },
    { keywords: ['vermouth', 'bianco'], subType: 'Bianco / Blanc Vermouth',   type: 'Fortified Wine' },
    { keywords: ['vermouth'],           subType: 'Dry Vermouth',              type: 'Fortified Wine' },
    { keywords: ['port'],               subType: 'Ruby Port',                 type: 'Fortified Wine' },
    { keywords: ['sherry'],             subType: 'Fino / Manzanilla Sherry',  type: 'Fortified Wine' },
    { keywords: ['madeira'],            subType: 'Madeira',                   type: 'Fortified Wine' },
    { keywords: ['sake'],               subType: 'Sake',                      type: 'Fortified Wine' },
    { keywords: ['dubonnet'],           subType: 'Sweet Vermouth',            type: 'Fortified Wine' },
    { keywords: ['lillet'],             subType: 'Bianco / Blanc Vermouth',   type: 'Fortified Wine' },

    // ── Wine ──────────────────────────────────────────────────────────────────
    { keywords: ['champagne'],     subType: 'Brut Champagne',   type: 'Wine' },
    { keywords: ['prosecco'],      subType: 'Prosecco / Cava',  type: 'Wine' },
    { keywords: ['cava'],          subType: 'Prosecco / Cava',  type: 'Wine' },
    { keywords: ['sparkling wine'],subType: 'Prosecco / Cava',  type: 'Wine' },
    { keywords: ['red wine'],      subType: 'Light Red Wine',   type: 'Wine' },
    { keywords: ['white wine'],    subType: 'Dry White Wine',   type: 'Wine' },
    { keywords: ['rosé wine'],     subType: 'Rosé Wine',        type: 'Wine' },
    { keywords: ['rose wine'],     subType: 'Rosé Wine',        type: 'Wine' },
    { keywords: ['rosé'],          subType: 'Rosé Wine',        type: 'Wine' },
    { keywords: ['wine'],          subType: 'Dry White Wine',   type: 'Wine' },

    // ── Beer & Cider ── root beer BEFORE 'beer' ───────────────────────────────
    // (ginger beer is handled above, before 'gin')
    { keywords: ['root beer'],  subType: 'Root Beer',        type: 'Carbonated Mixer' },
    { keywords: ['beer'],       subType: 'Lager / Pilsner',  type: 'Beer & Cider' },
    { keywords: ['lager'],      subType: 'Lager / Pilsner',  type: 'Beer & Cider' },
    { keywords: ['stout'],      subType: 'Stout & Porter',   type: 'Beer & Cider' },
    { keywords: ['guinness'],   subType: 'Stout & Porter',   type: 'Beer & Cider' },
    { keywords: ['cider'],      subType: 'Hard Cider',       type: 'Beer & Cider' },
    { keywords: ['ale'],        subType: 'Lager / Pilsner',  type: 'Beer & Cider' },
    { keywords: ['zima'],       subType: 'Lager / Pilsner',  type: 'Beer & Cider' },

    // ── Juice ─────────────────────────────────────────────────────────────────
    { keywords: ['lime juice'],          subType: 'Citrus Juice',       type: 'Juice' },
    { keywords: ['fresh lime juice'],    subType: 'Citrus Juice',       type: 'Juice' },
    { keywords: ['lemon juice'],         subType: 'Citrus Juice',       type: 'Juice' },
    { keywords: ['fresh lemon juice'],   subType: 'Citrus Juice',       type: 'Juice' },
    { keywords: ['orange juice'],        subType: 'Citrus Juice',       type: 'Juice' },
    { keywords: ['grapefruit juice'],    subType: 'Citrus Juice',       type: 'Juice' },
    { keywords: ['pineapple juice'],     subType: 'Tropical Juice',     type: 'Juice' },
    { keywords: ['passion fruit juice'], subType: 'Tropical Juice',     type: 'Juice' },
    { keywords: ['mango juice'],         subType: 'Tropical Juice',     type: 'Juice' },
    { keywords: ['fruit punch'],         subType: 'Tropical Juice',     type: 'Juice' },
    { keywords: ['fruit juice'],         subType: 'Citrus Juice',       type: 'Juice' },
    { keywords: ['cranberry juice'],     subType: 'Berry Juice',        type: 'Juice' },
    { keywords: ['pomegranate juice'],   subType: 'Berry Juice',        type: 'Juice' },
    { keywords: ['cherry juice'],        subType: 'Stone Fruit Juice',  type: 'Juice' },
    { keywords: ['grape juice'],         subType: 'Berry Juice',        type: 'Juice' },
    { keywords: ['peach juice'],         subType: 'Stone Fruit Juice',  type: 'Juice' },
    { keywords: ['peach', 'nectar'],     subType: 'Stone Fruit Juice',  type: 'Juice' },
    { keywords: ['apricot juice'],       subType: 'Stone Fruit Juice',  type: 'Juice' },
    { keywords: ['apricot', 'nectar'],   subType: 'Stone Fruit Juice',  type: 'Juice' },
    { keywords: ['tomato juice'],        subType: 'Vegetable Juice',    type: 'Juice' },
    { keywords: ['carrot juice'],        subType: 'Vegetable Juice',    type: 'Juice' },
    { keywords: ['apple juice'],         subType: 'Apple & Pear Juice', type: 'Juice' },
    { keywords: ['coconut water'],       subType: 'Coconut Water',      type: 'Juice' },
    { keywords: ['pink lemonade'],       subType: 'Berry Juice',        type: 'Juice' },
    { keywords: ['sour mix'],            subType: 'Citrus Juice',       type: 'Juice' },
    { keywords: ['sweet and sour'],      subType: 'Citrus Juice',       type: 'Juice' },
    { keywords: ['juice'],               subType: 'Citrus Juice',       type: 'Juice' },

    // ── Carbonated Mixer ──────────────────────────────────────────────────────
    { keywords: ['club soda'],           subType: 'Club Soda / Sparkling Water', type: 'Carbonated Mixer' },
    { keywords: ['soda water'],          subType: 'Club Soda / Sparkling Water', type: 'Carbonated Mixer' },
    { keywords: ['sparkling water'],     subType: 'Club Soda / Sparkling Water', type: 'Carbonated Mixer' },
    { keywords: ['seltzer'],             subType: 'Club Soda / Sparkling Water', type: 'Carbonated Mixer' },
    { keywords: ['carbonated water'],    subType: 'Club Soda / Sparkling Water', type: 'Carbonated Mixer' },
    { keywords: ['tonic water'],         subType: 'Tonic Water',                type: 'Carbonated Mixer' },
    { keywords: ['tonic'],               subType: 'Tonic Water',                type: 'Carbonated Mixer' },
    { keywords: ['bitter lemon'],        subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['coca-cola'],           subType: 'Cola',                       type: 'Carbonated Mixer' },
    { keywords: ['coca cola'],           subType: 'Cola',                       type: 'Carbonated Mixer' },
    { keywords: ['pepsi cola'],          subType: 'Cola',                       type: 'Carbonated Mixer' },
    { keywords: ['cola'],                subType: 'Cola',                       type: 'Carbonated Mixer' },
    { keywords: ['pepsi'],               subType: 'Cola',                       type: 'Carbonated Mixer' },
    { keywords: ['dr. pepper'],          subType: 'Cola',                       type: 'Carbonated Mixer' },
    { keywords: ['dr pepper'],           subType: 'Cola',                       type: 'Carbonated Mixer' },
    // (ginger ale handled before 'gin')
    { keywords: ['7-up'],                subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['sprite'],              subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['lemon-lime soda'],     subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['lemon-lime'],          subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['mountain dew'],        subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['surge'],               subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['lemonade'],            subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['limeade'],             subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['kool-aid'],            subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['fresca'],              subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['grape soda'],          subType: 'Lemon-Lime Soda',            type: 'Carbonated Mixer' },
    { keywords: ['sarsaparilla'],        subType: 'Root Beer',                  type: 'Carbonated Mixer' },
    { keywords: ['cream soda'],          subType: 'Cream Soda',                 type: 'Carbonated Mixer' },
    { keywords: ['carbonated soft drink'],subType: 'Club Soda / Sparkling Water',type: 'Carbonated Mixer' },
    { keywords: ['soda'],                subType: 'Club Soda / Sparkling Water', type: 'Carbonated Mixer' },

    // ── Sweetener ─────────────────────────────────────────────────────────────
    { keywords: ['simple syrup'],       subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },
    { keywords: ['sugar syrup'],        subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },
    { keywords: ['gomme'],              subType: 'Gomme Syrup',                   type: 'Sweetener' },
    { keywords: ['grenadine'],          subType: 'Grenadine',                     type: 'Sweetener' },
    { keywords: ['orgeat'],             subType: 'Orgeat (Almond Syrup)',         type: 'Sweetener' },
    { keywords: ['honey', 'syrup'],     subType: 'Honey Syrup',                   type: 'Sweetener' },
    { keywords: ['honey'],              subType: 'Honey Syrup',                   type: 'Sweetener' },
    { keywords: ['agave'],              subType: 'Agave Syrup',                   type: 'Sweetener' },
    { keywords: ['maple syrup'],        subType: 'Maple Syrup',                   type: 'Sweetener' },
    { keywords: ['demerara'],           subType: 'Demerara / Brown Sugar Syrup',  type: 'Sweetener' },
    { keywords: ['passion fruit syrup'],subType: 'Passion Fruit Syrup',           type: 'Sweetener' },
    { keywords: ['raspberry syrup'],    subType: 'Raspberry Syrup',               type: 'Sweetener' },
    { keywords: ['vanilla syrup'],      subType: 'Vanilla Syrup',                 type: 'Sweetener' },
    { keywords: ['vanilla extract'],    subType: 'Vanilla Syrup',                 type: 'Sweetener' },
    { keywords: ['cinnamon syrup'],     subType: 'Cinnamon Syrup',                type: 'Sweetener' },
    { keywords: ['coconut syrup'],      subType: 'Coconut Syrup',                 type: 'Sweetener' },
    { keywords: ['chocolate syrup'],    subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },
    { keywords: ['corn syrup'],         subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },
    { keywords: ['sirup of roses'],     subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },
    { keywords: ['mint syrup'],         subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },
    { keywords: ['rosemary syrup'],     subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },
    { keywords: ['pineapple', 'syrup'], subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },
    { keywords: ['syrup'],              subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },
    { keywords: ['sugar'],              subType: 'Simple Syrup (1:1)',            type: 'Sweetener' },

    // ── Bitters ───────────────────────────────────────────────────────────────
    { keywords: ['angostura'],        subType: 'Aromatic Bitters',           type: 'Bitters' },
    { keywords: ['orange bitters'],   subType: 'Orange Bitters',             type: 'Bitters' },
    { keywords: ['peychaud'],         subType: "Creole / Peychaud's Bitters",type: 'Bitters' },
    { keywords: ['chocolate bitters'],subType: 'Mole & Chocolate Bitters',   type: 'Bitters' },
    { keywords: ['peach bitters'],    subType: 'Aromatic Bitters',           type: 'Bitters' },
    { keywords: ['bitters'],          subType: 'Aromatic Bitters',           type: 'Bitters' },

    // ── Fresh Produce: garnish variants BEFORE plain fruit entries ────────────
    // Maraschino cherry (garnish) MUST precede generic 'cherr'
    { keywords: ['maraschino cherry'], subType: 'Cocktail Cherry',    type: 'Garnish' },
    { keywords: ['cocktail cherry'],   subType: 'Cocktail Cherry',    type: 'Garnish' },
    // Citrus peel/wedge garnish entries before plain fruit
    { keywords: ['lime', 'peel'],      subType: 'Citrus Twist / Peel',   type: 'Garnish' },
    { keywords: ['lime', 'wedge'],     subType: 'Citrus Wedge',          type: 'Garnish' },
    { keywords: ['lime', 'wheel'],     subType: 'Citrus Wheel / Slice',  type: 'Garnish' },
    { keywords: ['lime', 'slice'],     subType: 'Citrus Wheel / Slice',  type: 'Garnish' },
    { keywords: ['lemon', 'peel'],     subType: 'Citrus Twist / Peel',   type: 'Garnish' },
    { keywords: ['lemon', 'twist'],    subType: 'Citrus Twist / Peel',   type: 'Garnish' },
    { keywords: ['lemon', 'wedge'],    subType: 'Citrus Wedge',          type: 'Garnish' },
    { keywords: ['orange', 'peel'],    subType: 'Citrus Twist / Peel',   type: 'Garnish' },
    { keywords: ['orange', 'twist'],   subType: 'Citrus Twist / Peel',   type: 'Garnish' },
    { keywords: ['orange', 'spiral'],  subType: 'Citrus Twist / Peel',   type: 'Garnish' },
    { keywords: ['orange', 'slice'],   subType: 'Citrus Wheel / Slice',  type: 'Garnish' },
    // Citrus fruit
    { keywords: ['blood orange'],  subType: 'Citrus Fruit', type: 'Fresh Produce' },
    { keywords: ['lime'],          subType: 'Citrus Fruit', type: 'Fresh Produce' },
    { keywords: ['lemon'],         subType: 'Citrus Fruit', type: 'Fresh Produce' },
    { keywords: ['orange'],        subType: 'Citrus Fruit', type: 'Fresh Produce' },
    { keywords: ['grapefruit'],    subType: 'Citrus Fruit', type: 'Fresh Produce' },
    // Tropical fruit
    { keywords: ['pineapple'],  subType: 'Tropical Fruit', type: 'Fresh Produce' },
    { keywords: ['banana'],     subType: 'Tropical Fruit', type: 'Fresh Produce' },
    { keywords: ['mango'],      subType: 'Tropical Fruit', type: 'Fresh Produce' },
    { keywords: ['papaya'],     subType: 'Tropical Fruit', type: 'Fresh Produce' },
    { keywords: ['kiwi'],       subType: 'Tropical Fruit', type: 'Fresh Produce' },
    { keywords: ['fig'],        subType: 'Tropical Fruit', type: 'Fresh Produce' },
    { keywords: ['watermelon'], subType: 'Melon',          type: 'Fresh Produce' },
    // apple — lowercase fixes the capital-A bug
    { keywords: ['apple'],      subType: 'Apple & Pear',   type: 'Fresh Produce' },
    // Stone fruit — 'cherr' catches both cherry/cherries
    { keywords: ['peach'],  subType: 'Stone Fruit', type: 'Fresh Produce' },
    { keywords: ['cherr'],  subType: 'Stone Fruit', type: 'Fresh Produce' },
    // Berry
    { keywords: ['strawberr'],  subType: 'Berry', type: 'Fresh Produce' },
    { keywords: ['raspberr'],   subType: 'Berry', type: 'Fresh Produce' },
    { keywords: ['blueberr'],   subType: 'Berry', type: 'Fresh Produce' },
    { keywords: ['blackberr'],  subType: 'Berry', type: 'Fresh Produce' },
    // Herbs
    { keywords: ['mint'],       subType: 'Herb', type: 'Fresh Produce' },
    { keywords: ['basil'],      subType: 'Herb', type: 'Fresh Produce' },
    { keywords: ['rosemary'],   subType: 'Herb', type: 'Fresh Produce' },
    { keywords: ['thyme'],      subType: 'Herb', type: 'Fresh Produce' },
    { keywords: ['cilantro'],   subType: 'Herb', type: 'Fresh Produce' },
    { keywords: ['coriander'],  subType: 'Herb', type: 'Fresh Produce' },
    { keywords: ['wormwood'],   subType: 'Herb', type: 'Fresh Produce' },
    // Vegetables
    { keywords: ['cucumber'],  subType: 'Vegetable', type: 'Fresh Produce' },
    { keywords: ['celery'],    subType: 'Vegetable', type: 'Fresh Produce' },
    { keywords: ['jalapeno'],  subType: 'Vegetable', type: 'Fresh Produce' },
    { keywords: ['jalapeño'],  subType: 'Vegetable', type: 'Fresh Produce' },
    { keywords: ['black pepper'], subType: 'Spice / Root', type: 'Fresh Produce' },
    { keywords: ['pepper'],    subType: 'Vegetable', type: 'Fresh Produce' },
    // Spices — allspice BEFORE 'ice' (allspice contains 'ice')
    { keywords: ['allspice'],  subType: 'Spice / Root', type: 'Fresh Produce' },
    { keywords: ['cinnamon'],  subType: 'Spice / Root', type: 'Fresh Produce' },
    { keywords: ['nutmeg'],    subType: 'Spice / Root', type: 'Fresh Produce' },
    { keywords: ['clove'],     subType: 'Spice / Root', type: 'Fresh Produce' },
    { keywords: ['cardamom'],  subType: 'Spice / Root', type: 'Fresh Produce' },
    { keywords: ['cumin'],     subType: 'Spice / Root', type: 'Fresh Produce' },

    // ── Dairy & Egg ───────────────────────────────────────────────────────────
    // cream of coconut / coconut cream BEFORE plain 'cream'
    { keywords: ['cream of coconut'],  subType: 'Coconut Milk / Cream', type: 'Other' },
    { keywords: ['coconut cream'],     subType: 'Coconut Milk / Cream', type: 'Other' },
    { keywords: ['heavy cream'],       subType: 'Cream',      type: 'Dairy & Egg' },
    { keywords: ['whipping cream'],    subType: 'Cream',      type: 'Dairy & Egg' },
    { keywords: ['whipped cream'],     subType: 'Cream',      type: 'Dairy & Egg' },
    { keywords: ['light cream'],       subType: 'Cream',      type: 'Dairy & Egg' },
    { keywords: ['half-and-half'],     subType: 'Cream',      type: 'Dairy & Egg' },
    { keywords: ['cream'],             subType: 'Cream',      type: 'Dairy & Egg' },
    { keywords: ['condensed'],         subType: 'Milk',       type: 'Dairy & Egg' },
    { keywords: ['milk'],              subType: 'Milk',       type: 'Dairy & Egg' },
    { keywords: ['yogurt'],            subType: 'Milk',       type: 'Dairy & Egg' },
    { keywords: ['yoghurt'],           subType: 'Milk',       type: 'Dairy & Egg' },
    { keywords: ['egg white'],         subType: 'Egg White',  type: 'Dairy & Egg' },
    { keywords: ['egg yolk'],          subType: 'Egg Yolk',   type: 'Dairy & Egg' },
    { keywords: ['egg'],               subType: 'Whole Egg',  type: 'Dairy & Egg' },

    // ── Garnish ───────────────────────────────────────────────────────────────
    { keywords: ['olive brine'], subType: 'Olive & Onion',        type: 'Garnish' },
    { keywords: ['olive'],       subType: 'Olive & Onion',        type: 'Garnish' },
    { keywords: ['onion'],       subType: 'Olive & Onion',        type: 'Garnish' },
    { keywords: ['mint sprig'],  subType: 'Herb Sprig',           type: 'Garnish' },
    { keywords: ['lime wedge'],  subType: 'Citrus Wedge',         type: 'Garnish' },
    { keywords: ['orange slice'],subType: 'Citrus Wheel / Slice', type: 'Garnish' },
    { keywords: ['lemon peel'],  subType: 'Citrus Twist / Peel',  type: 'Garnish' },
    { keywords: ['orange peel'], subType: 'Citrus Twist / Peel',  type: 'Garnish' },
    { keywords: ['lavender'],    subType: 'Herb Sprig',           type: 'Garnish' },
    { keywords: ['salt'],        subType: 'Rim Salt / Sugar',     type: 'Garnish' },

    // ── Other ─────────────────────────────────────────────────────────────────
    // iced tea BEFORE 'ice' (iced tea contains 'ice')
    { keywords: ['iced tea'],       subType: 'Hot Water / Tea',       type: 'Other' },
    { keywords: ['ice cubes'],      subType: 'Ice',                   type: 'Other' },
    { keywords: ['crushed ice'],    subType: 'Ice',                   type: 'Other' },
    { keywords: ['ice'],            subType: 'Ice',                   type: 'Other' },
    { keywords: ['coconut milk'],   subType: 'Coconut Milk / Cream',  type: 'Other' },
    { keywords: ['pina colada mix'],subType: 'Coconut Milk / Cream',  type: 'Other' },
    { keywords: ['hot chocolate'],  subType: 'Hot Water / Tea',       type: 'Other' },
    { keywords: ['espresso'],       subType: 'Hot Water / Tea',       type: 'Other' },
    { keywords: ['tea'],            subType: 'Hot Water / Tea',       type: 'Other' },
    { keywords: ['coffee'],         subType: 'Hot Water / Tea',       type: 'Other' },
    { keywords: ['hot water'],      subType: 'Hot Water / Tea',       type: 'Other' },
    { keywords: ['water'],          subType: 'Water',                 type: 'Other' },
    { keywords: ['tabasco'],        subType: 'Salt / Saline Solution',type: 'Other' },
    { keywords: ['worcestershire'], subType: 'Salt / Saline Solution',type: 'Other' },
    { keywords: ['hot sauce'],      subType: 'Salt / Saline Solution',type: 'Other' },
    { keywords: ['soy sauce'],      subType: 'Salt / Saline Solution',type: 'Other' },
    { keywords: ['sauce'],          subType: 'Salt / Saline Solution',type: 'Other' },
]

/**
 * Fallback: maps CocktailDB strType (lowercased) → local IngredientType name.
 * Used only when INGREDIENT_SUBTYPE_KEYWORDS produces no match.
 */
export const INGREDIENT_TYPE_MAP: Record<string, string> = {
    'vodka': 'Spirit', 'gin': 'Spirit', 'rum': 'Spirit', 'tequila': 'Spirit',
    'whisky': 'Spirit', 'whiskey': 'Spirit', 'bourbon': 'Spirit', 'scotch': 'Spirit',
    'brandy': 'Spirit', 'cognac': 'Spirit', 'mezcal': 'Spirit', 'spirit': 'Spirit',
    'liqueur': 'Liqueur', 'vermouth': 'Fortified Wine', 'port': 'Fortified Wine',
    'sherry': 'Fortified Wine', 'wine': 'Wine', 'champagne': 'Wine',
    'beer': 'Beer & Cider', 'cider': 'Beer & Cider',
    'juice': 'Juice', 'soft drink': 'Carbonated Mixer', 'soda': 'Carbonated Mixer',
    'syrup': 'Sweetener', 'sugar': 'Sweetener', 'sweetener': 'Sweetener',
    'bitters': 'Bitters', 'fruit': 'Fresh Produce', 'herb': 'Fresh Produce',
    'vegetable': 'Fresh Produce', 'spice': 'Fresh Produce',
    'dairy': 'Dairy & Egg', 'cream': 'Dairy & Egg', 'egg': 'Dairy & Egg',
    'garnish': 'Garnish', 'flower': 'Garnish',
    'cereal': 'Other', 'mineral': 'Other', 'water': 'Other', 'special': 'Other',
}

/** Maps CocktailDB glass names (lowercased) → local Glass names */
export const GLASS_NAME_MAP: Record<string, string> = {
    'highball glass': 'Highball',
    'cocktail glass': 'Martini',
    'old-fashioned glass': 'Old Fashioned',
    'whiskey glass': 'Old Fashioned',
    'whiskey sour glass': 'Old Fashioned',
    'rocks glass': 'Rocks',
    'lowball glass': 'Rocks',
    'collins glass': 'Collins',
    'champagne flute': 'Flute',
    'martini glass': 'Martini',
    'margarita glass': 'Margarita',
    'margarita/coupette glass': 'Margarita',
    'hurricane glass': 'Hurricane',
    'coupe glass': 'Coupe',
    'nick and nora glass': 'Nick & Nora',
    'copper mug': 'Copper Mug',
    'shot glass': 'Shot',
    'brandy snifter': 'Snifter',
    'wine glass': 'Wine Glass',
    'white wine glass': 'Wine Glass',
    'irish coffee cup': 'Irish Coffee',
    'irish coffee glass': 'Irish Coffee',
    'punch bowl': 'Punch Cup',
    'punch glass': 'Punch Cup',
    'beer mug': 'Highball',
    'beer glass': 'Highball',
    'beer pilsner': 'Highball',
    'mason jar': 'Highball',
    'jar': 'Highball',
    'pitcher': 'Highball',
    'pint glass': 'Highball',
    'coffee mug': 'Irish Coffee',
    'balloon glass': 'Wine Glass',
    'cordial glass': 'Shot',
    'pousse cafe glass': 'Shot',
    'parfait glass': 'Hurricane',
    'zombie glass': 'Hurricane',
}
