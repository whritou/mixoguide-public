import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "prisma/migrations/**",
      "public/**",
      "dist/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],

      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/refs": "warn",
      // Rules-of-hooks violations are runtime bugs, not style (CQ-003).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/use-memo": "warn",
      "react/no-unescaped-entities": "warn",

      // Accessibility (TEST-004): eslint-config-next only enables a handful of
      // jsx-a11y rules; these catch unlabeled form controls and icon buttons.
      "jsx-a11y/label-has-associated-control": ["warn", { assert: "either", depth: 3 }],
      "jsx-a11y/control-has-associated-label": [
        "warn",
        {
          ignoreElements: ["audio", "canvas", "embed", "input", "textarea", "tr", "video"],
          ignoreRoles: ["grid", "listbox", "menu", "menubar", "radiogroup", "row", "tablist", "toolbar", "tree", "treegrid"],
          includeRoles: ["alert", "dialog"],
          depth: 3,
        },
      ],
    },
  },
];

export default eslintConfig;
