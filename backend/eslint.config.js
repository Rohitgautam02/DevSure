import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": "off", // Allow console.log in Node.js
      "semi": ["error", "always"],
      "quotes": ["warn", "single", { "avoidEscape": true }],
      "indent": ["warn", 2],
      "no-multiple-empty-lines": ["warn", { "max": 2 }],
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "no-var": "error",
      "prefer-const": "warn"
    }
  },
  {
    ignores: [
      "node_modules/",
      "prisma/",
      "*.min.js"
    ]
  }
];
