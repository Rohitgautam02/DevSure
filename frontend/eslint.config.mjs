import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
      "semi": ["error", "always"],
      "quotes": ["warn", "single", { "avoidEscape": true }],
      "no-multiple-empty-lines": ["warn", { "max": 2 }],
      "eqeqeq": ["error", "always"],
      "prefer-const": "warn"
    }
  },
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "*.min.js"
    ]
  }
);
