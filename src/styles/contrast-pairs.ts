export type ContrastPair = { fg: string; bg: string; min: 3 | 4.5 }

const pairs = (fgs: string[], bgs: string[], min: 3 | 4.5): ContrastPair[] =>
    fgs.flatMap((fg) => bgs.map((bg) => ({ fg, bg, min })))

export const CONTRAST_PAIRS: ContrastPair[] = [
    ...pairs(['fg', 'fg-secondary', 'fg-dim', 'fg-muted'], ['canvas', 'surface', 'surface-subtle', 'surface-muted'], 4.5),
    ...pairs(['brand'], ['canvas', 'surface', 'surface-muted'], 4.5),
    ...pairs(['fg-on-brand'], ['brand'], 4.5),
    ...pairs(['success'], ['success-bg'], 4.5),
    ...pairs(['missing'], ['missing-bg'], 4.5),
    ...pairs(['warning'], ['warning-bg'], 4.5),
    ...pairs(['danger'], ['danger-bg', 'canvas', 'surface'], 4.5),
    ...pairs(['fg-on-inverse'], ['surface-inverse'], 4.5),
    // brand-soft-strong is used as small body text (~70 call sites), so it needs 4.5:1.
    ...pairs(['brand-soft-strong'], ['canvas', 'surface', 'surface-subtle', 'surface-muted'], 4.5),
    // Primary CTAs render fg-on-brand text over the brand gradient: both stops must pass.
    ...pairs(['fg-on-brand'], ['brand-gradient-from', 'brand-gradient-to', 'danger'], 4.5),
    // Non-text: focus ring (solid, see globals.css) and form-control borders.
    ...pairs(['ring'], ['canvas', 'surface', 'surface-subtle', 'surface-muted'], 3),
    ...pairs(['line-control'], ['canvas', 'surface'], 3),
    ...pairs(['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'], ['surface'], 3),
]
