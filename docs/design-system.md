# MixoGuide design system

Live reference: `/admin/design-system` (admin only) renders every token, text sample, status pill, shadcn component, the jazz pieces and a cocktail card in light and dark side by side. The public design-system artifact it mirrors: https://claude.ai/artifact/U6mVtyzdE5BdsccnsxeW6f

## Two layers

1. **Primitives** (`--mg-*`, `--velvet-*`, `--gold-*` in `src/styles/tokens.css`): raw palette values. They are not meant to be used directly in components.
2. **Semantic tokens** (`--canvas`, `--surface`, `--fg`, `--brand`, `--line`, ...): named by role, defined once for light in `:root` and once for dark in `.dark`. Components use these through Tailwind classes such as `bg-surface`, `text-fg-muted`, `border-line`. The shadcn variables (`--background`, `--primary`, ...) simply point at the semantic tokens.

## Themes change colour only

Light and dark differ only in the values of the same token names. Layout, spacing, radii, typography and shadow geometry never branch on theme, and components never need a `dark:` variant for colour: if a component looks wrong in one theme, the fix is a better token, not a conditional class.

## Decorative vs meaningful tokens

Some colours exist in two flavours so decorative use keeps its look while meaningful use passes WCAG AA contrast:

- Decorative: `brand-soft`, `warning-accent`, `line`, `line-strong`, `line-brass`. Fills, gradients, dots, dividers.
- Meaningful: `brand-soft-strong`, `warning`, `line-control`, `fg-muted`, `ring`. Text, icons, control borders, focus rings.

Pick by what the colour communicates, not by how it looks today.

## Adding a token

1. Add it to both `:root` and `.dark` in `src/styles/tokens.css`, and expose it as `--color-<name>` in the `@theme inline` block.
2. Add it with a one-line role to `src/styles/token-list.ts` (a unit test checks it exists in both blocks; the reference page picks it up automatically).
3. If it carries text or an icon, declare its pair in `src/styles/contrast-pairs.ts` so contrast is enforced in both themes.
