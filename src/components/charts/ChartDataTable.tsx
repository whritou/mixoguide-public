/**
 * Screen-reader text alternative for a chart (WCAG 1.1.1, A11Y-017): the
 * plotted series as a visually hidden table. Pair it with an `aria-hidden`
 * chart container so assistive tech reads the table, not the SVG internals.
 */
export function ChartDataTable({
    caption,
    columns,
    rows,
}: {
    caption: string
    columns: [string, string, ...string[]]
    rows: Array<Array<string | number>>
}) {
    return (
        <table className="sr-only">
            <caption>{caption}</caption>
            <thead>
                <tr>
                    {columns.map((c) => (
                        <th key={c} scope="col">
                            {c}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td colSpan={columns.length}>No data</td>
                    </tr>
                ) : (
                    rows.map((r, i) => (
                        <tr key={i}>
                            {r.map((cell, j) =>
                                j === 0 ? (
                                    <th key={j} scope="row">
                                        {cell}
                                    </th>
                                ) : (
                                    <td key={j}>{cell}</td>
                                ),
                            )}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    )
}
