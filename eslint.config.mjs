import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'implementation_plan.md'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // House rule from SKILL.md: zero `any` shortcuts.
      '@typescript-eslint/no-explicit-any': 'error',
      // Reserved-for-future parameters keep call sites stable; underscore marks intent.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Real failure paths may log; chatter may not.
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
);
