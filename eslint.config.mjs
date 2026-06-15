import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-*/**",
    "out/**",
    "build/**",
    "ios/**",
    "android/**",
    "design_handoff_*/**",
    "handoff_*/**",
    "lib/vendor/**",
    "rayo/**",
    "rayo-design-system/**",
    "scripts/**",
    "check_sdk.js",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react/jsx-no-comment-textnodes": "warn",
    },
  },
]);

export default eslintConfig;
