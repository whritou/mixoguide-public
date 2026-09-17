'use client'

interface BarToolEntry {
  barTool: { id: string; name: string; isEssential?: boolean }
}

interface CocktailDetailProps {
  instructions?: string[]
  barTools?: BarToolEntry[]
}

export default function CocktailDetails({ cocktail }: { cocktail: CocktailDetailProps }) {
  return (
    <section aria-labelledby="ingredients" className="w-full">
      {/* INSTRUCTIONS ------------------------------------------------ */}
      {cocktail.instructions && cocktail.instructions.length > 0 && (
        <>
          <h2
            id="instructions"
            className="font-title text-mg-copper text-2xl font-semibold mb-4"
          >
            Steps
          </h2>
          <ol
            className="space-y-6 max-w-prose text-slate-800"
            aria-labelledby="instructions"
          >
            {cocktail.instructions.map((step: string, i: number) => (
              <li key={i} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-mg-copper text-white font-semibold text-sm mt-1 shrink-0">
                  {i + 1}
                </div>
                <p className="text-md leading-relaxed first-letter:capitalize">{step}</p>
              </li>
            ))}
          </ol>
        </>
      )}
        {/* BAR TOOLS --------------------------------------------------- */}
        {cocktail.barTools && cocktail.barTools.length > 0 && (
            <div className="mt-10">
                <h2
                    id="bar-tools"
                    className="font-title text-mg-copper text-2xl font-semibold mb-4"
                >
                    Bar Tools
                </h2>

                <ol className="ml-6 space-y-3 max-w-prose text-slate-800">
                    {cocktail.barTools.map((item) => {
                        const tool = item.barTool

                        return (
                            <li key={tool.id} className="list-disc">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{tool.name}</span>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded ${
                                                tool.isEssential
                                                    ? "bg-green-200 text-green-800"
                                                    : "bg-yellow-100 text-yellow-700"
                                            }`}
                                        >
                                          {tool.isEssential ? "Essential" : "Optional"}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ol>
            </div>
        )}

    </section>
  )
}
