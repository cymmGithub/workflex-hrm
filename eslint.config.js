import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '.husky/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // Type-aware linting: resolve each file to its nearest tsconfig automatically.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Async signatures are often framework-mandated (Fastify plugins/handlers,
      // node-pg-migrate up/down) and legitimately contain no await — drop the false positives.
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // JS/config files aren't part of a TS program — disable type-aware rules for them.
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Keep ESLint out of formatting decisions — Prettier owns those.
  eslintConfigPrettier,
);
