import clsx from "clsx"

const units = ["ml", "oz", "cl"] as const
type Unit = typeof units[number]

export default function UnitPicker({
                                       unit,
                                       setUnit,
                                   }: {
    unit: Unit
    setUnit: (u: Unit) => void
}) {
    return (
        <div className="flex items-center">
            <div className="flex bg-surface-muted rounded-full p-1">
                {units.map((u) => {
                    const isActive = unit === u

                    return (
                        <button
                            key={u}
                            type="button"
                            onClick={() => setUnit(u)}
                            aria-pressed={isActive}
                            className={clsx(
                                "px-4 h-8 rounded-full text-xs font-medium uppercase transition-all",
                                "flex items-center justify-center",

                                isActive
                                    ? "bg-brand text-fg-on-brand shadow-sm"
                                    : "text-fg-dim hover:bg-surface-muted-hover"
                            )}
                        >
                            {u}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}