import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Layer rule: inner layers never import outer layers (see docs/architecture/*.md).
const banImports = (patterns, message) => ({
  "no-restricted-imports": ["error", { patterns: [{ group: patterns, message }] }],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  { rules: { "@typescript-eslint/no-explicit-any": "error" } },
  {
    files: ["src/domain/**"],
    rules: banImports(
      [
        "@/application/*",
        "@/infrastructure/*",
        "@/lib/*",
        "@/app/*",
        "@/components/*",
        "next",
        "next/*",
        "@supabase/*",
        "@mastra/*",
        "react",
      ],
      "domain/ is pure TypeScript: no framework or outer-layer imports.",
    ),
  },
  {
    files: ["src/application/**"],
    rules: banImports(
      [
        "@/infrastructure/*",
        "@/lib/*",
        "@/app/*",
        "@/components/*",
        "next",
        "next/*",
        "@supabase/*",
        "@mastra/*",
        "react",
      ],
      "application/ depends only on domain/ interfaces.",
    ),
  },
  {
    files: ["src/infrastructure/**"],
    rules: banImports(
      ["@/lib/*", "@/app/*", "@/components/*"],
      "infrastructure/ must not import outer layers.",
    ),
  },
  {
    files: ["src/components/**"],
    rules: banImports(
      ["@/infrastructure/*", "@/application/*", "@/lib/container", "@supabase/*", "@mastra/*"],
      "components/ get data via props and mutate via server actions only.",
    ),
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/infrastructure/supabase/database.types.ts",
  ]),
]);

export default eslintConfig;
