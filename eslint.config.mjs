import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // eslint-config-next 16 upgrades eslint-plugin-react-hooks to the React
    // Compiler rule set, which newly flags several pre-existing patterns
    // (setState-in-effect resets, contentEditable prop mutation in EntryRow).
    // These are error-level by default; downgrade to warn so the toolchain
    // bump doesn't block CI, and address them in a dedicated refactor.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "next-env.d.ts",
      // Service worker: browser SW globals, deliberately dependency-free.
      "public/sw.js",
    ],
  },
];

export default eslintConfig;
