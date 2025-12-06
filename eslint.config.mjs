import eslintConfigPkg from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const { defineConfig, globalIgnores } = eslintConfigPkg;

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "dist/**",
    "desktop/build/**",
    "desktop/out/**",
    "next-env.d.ts",
    "desktop/preload.js",
    "public",
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
