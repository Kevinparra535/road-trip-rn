// Flat config (ESLint 9) adaptado del .eslintrc.js canonico del autor.
// Conserva las mismas reglas y la idea de grupos de import-sort por tipo de
// archivo, mapeada a la estructura de Road Trip (RN + Expo + Clean Arch):
//
//   - Default: cualquier .ts/.tsx
//   - Screens: `**/*Screen.tsx` (equivalente a `*.view.tsx` del canon)
//   - ViewModels: `**/*ViewModel.ts` (en RN son .ts, no .tsx — no rendrean JSX)
//   - DI bootstrap: `**/config/di.ts`
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const globals = require('globals');

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,

  // ── Reglas globales + import-sort default ──────────────────────────────────
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        ...globals.es2021,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // Estilo
      'arrow-body-style': ['error', 'as-needed'],

      // Off (preservado del .eslintrc canonico — TS / Prettier / preferencias)
      'no-console': 'off',
      'no-undef': 'off',
      'no-unused-expressions': 'off',
      'no-nested-ternary': 'off',
      'no-restricted-globals': 'off',
      'no-param-reassign': 'off',
      'no-unused-vars': 'off',

      'react/function-component-definition': 'off',
      'react/button-has-type': 'off',
      'react/jsx-filename-extension': ['warn', { extensions: ['.tsx', '.ts'] }],
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/require-default-props': 'off',
      'react/jsx-no-useless-fragment': 'off',
      'react/no-unescaped-entities': 'off',

      'import/extensions': 'off',
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'off',
      'import/order': 'off',

      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      // Import sorting (default — cualquier .ts/.tsx)
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. React + dependencias externas (npm packages)
            ['^react', '^@?\\w'],

            // 2. Config del proyecto (DI, TYPES, env, devFlags)
            ['^@/config/'],

            // 3. Domain — entities primero (datos puros)
            ['^@/domain/entities/'],

            // 4. Domain — contratos (repositories + services)
            ['^@/domain/(repositories|services)/'],

            // 5. Domain — useCases (la API que el VM consume)
            ['^@/domain/useCases/'],

            // 6. Domain — helpers puros (geo, math)
            ['^@/domain/geo/'],

            // 7. Data — services -> repositories -> models
            ['^@/data/services/'],
            ['^@/data/repositories/'],
            ['^@/data/models/'],

            // 8. UI — components reusables -> navigation/map -> stores VM
            ['^@/ui/components/'],
            ['^@/ui/(navigation|map)/'],
            ['^@/ui/viewModels/'],

            // 9. UI — styles + utils (tokens y helpers de presentacion)
            ['^@/ui/styles/', '^@/ui/utils/'],

            // 10. Cualquier alias que no encajo arriba
            ['^@/'],

            // 11. Relativos (./ y ../)
            ['^\\.\\.'],
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },

  // ── Screens: `XxxScreen.tsx` (equivalente a `*.view.tsx` del canon) ────────
  // El VM relativo del screen va al final, justo antes de los assets locales.
  {
    files: ['**/*Screen.tsx'],
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react', '^mobx', '^expo', '^@?\\w'],
            ['^@/config/'],
            ['^@/domain/entities/'],
            ['^@/domain/(repositories|services)/'],
            ['^@/domain/useCases/'],
            ['^@/domain/geo/'],
            ['^@/data/services/', '^@/data/repositories/', '^@/data/models/'],
            ['^@/ui/components/'],
            ['^@/ui/(navigation|map)/'],
            ['^@/ui/viewModels/'],
            ['^@/ui/styles/', '^@/ui/utils/'],
            ['^@/'],
            // Padre antes que hermano (clasica regla)
            ['^\\.\\.'],
            // El ViewModel local del screen va al final, separado
            ['^\\./.*ViewModel$'],
            ['^\\.'],
          ],
        },
      ],
    },
  },

  // ── ViewModels: `XxxViewModel.ts` (canon: `*.viewModel.tsx`) ───────────────
  // No tocan React. inversify + mobx primero; useCases en el medio; UI utils
  // (Logger, otros stores singleton) al final.
  {
    files: ['**/*ViewModel.ts'],
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^inversify', '^mobx', '^expo', '^@?\\w'],
            ['^@/config/'],
            ['^@/domain/entities/'],
            ['^@/domain/(repositories|services)/'],
            ['^@/domain/useCases/'],
            ['^@/domain/geo/'],
            ['^@/ui/viewModels/'],
            ['^@/ui/styles/', '^@/ui/utils/'],
            ['^@/ui/'],
            ['^@/'],
            ['^\\.\\.'],
            ['^\\.'],
          ],
        },
      ],
    },
  },

  // ── DI bootstrap: `src/config/di.ts` ──────────────────────────────────────
  // Orden ceremonial: reflect-metadata + inversify -> TYPES -> data (impls) ->
  // domain (contratos) -> useCases -> viewModels. Igual que el canon.
  {
    files: ['**/config/di.ts'],
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^reflect-metadata', '^inversify', '^@?\\w'],
            ['^@/config/types$'],
            ['^@/data/services/'],
            ['^@/data/repositories/'],
            ['^@/data/models/'],
            ['^@/domain/(repositories|services)/'],
            ['^@/domain/useCases/'],
            ['^@/ui/viewModels/', '^@/ui/screens/'],
            ['^@/'],
            ['^\\.'],
          ],
        },
      ],
    },
  },

  // ── Ignores ────────────────────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'android/',
      'ios/',
      'coverage/',
      'dist/',
      'docs/',
    ],
  },
];
