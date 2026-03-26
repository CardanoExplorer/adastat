import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import disableAutofix from 'eslint-plugin-disable-autofix'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unreachable': 'warn',
      eqeqeq: ['error', 'smart'],
      curly: ['error', 'all'],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/prefer-readonly': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-shadow': [
        'error',
        {
          builtinGlobals: true,
          hoist: 'all',
          // allow: ['err', 'error', 'e'],
          ignoreOnInitialization: false,
          ignoreTypeValueShadow: false,
          ignoreFunctionTypeParameterNameValueShadow: false,
        },
      ],
    },
  },
  disableAutofix.configure({
    'prefer-const': 'warn',
  })
)
