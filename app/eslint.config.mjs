import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * M003/S04 official lint gate.
 *
 * We keep all rules enabled (no global disabling), but we scope linting to the
 * official contract suite + the production seams/actions it exercises.
 *
 * This prevents the lint gate from being blocked by unrelated legacy UI debt.
 */
const eslintConfig = defineConfig([
  // Start from Next defaults.
  ...nextVitals,
  ...nextTs,

  // Lint only these files for M003 gate.
  {
    files: [
      "src/lib/test-seams.ts",
      "src/lib/prisma.ts",
      "src/auth.ts",
      "src/actions/activity.ts",
      "src/actions/finance/**/*.ts",
      "src/actions/finance/**/*.tsx",
      "src/actions/finance/__tests__/**/*.ts",
      "src/actions/activity.__tests__/**/*.ts",
      "src/app/parent/finances/**/*.ts",
      "src/app/parent/finances/**/*.tsx",
    ],
  },

  // Ignore Next build artifacts (keep everything else lintable, but we pass an explicit file list from the npm script).
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
