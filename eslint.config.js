// @ts-check
import antfu from '@antfu/eslint-config'
import oxlint from 'eslint-plugin-oxlint'
import nuxt from './.nuxt/eslint.config.mjs'

export default antfu(
  {
    unocss: true,
    formatters: true,
    pnpm: true,

    typescript: {
      overrides: {
        'ts/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      },
    },

    vue: {
      overrides: {
        'vue/custom-event-name-casing': ['error', 'kebab-case'],
        'vue/no-unused-properties': ['error', {
          groups: ['props', 'data', 'computed', 'methods'],
        }],
        'vue/no-unused-emit-declarations': 'error',
        'vue/prefer-use-template-ref': 'error',
        'vue/define-props-destructuring': 'error',
        'vue/max-template-depth': ['error', { maxDepth: 8 }],
        'vue/max-props': ['error', { maxProps: 6 }],
      },
    },
  },

  // Disable multi-word names for Nuxt pages (single-word filenames are normal)
  {
    files: ['app/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  // General rules for all TS/Vue files
  {
    rules: {
      'complexity': ['warn', { max: 10 }],
      // Replaces antfu's array — must re-include TSExportAssignment
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Use `as const` objects or union types instead of enums.',
        },
        {
          selector: 'TSExportAssignment',
          message: 'Use `export default` instead of `export =`.',
        },
        {
          selector: 'IfStatement > IfStatement.alternate',
          message: 'Avoid `else if`. Prefer early returns or guard clauses.',
        },
        {
          selector: 'IfStatement > :not(IfStatement).alternate',
          message: 'Avoid `else`. Prefer early returns or guard clauses.',
        },
      ],
    },
  },
)
  .append(nuxt())
  // MUST BE LAST — turns off ESLint rules that oxlint already handles
  .append(oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'))
