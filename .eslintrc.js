module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  rules: {
    // import resolver 문제 임시 비활성화
    'import/namespace': 'off',
    'import/default': 'off',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',


    // 콘솔 사용: babel-plugin-transform-remove-console이 프로덕션에서 자동 제거하므로 off
    'no-console': 'off',

    // TypeScript 관련 규칙
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-var-requires': 'warn',

    // TypeScript 5.x 업데이트로 인한 false positive 방지
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-wrapper-object-types': 'off',

    // React/React Native 규칙
    'react/prop-types': 'off', // TypeScript 사용하므로 불필요
    'react/display-name': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // 일반 코드 품질 규칙
    'no-var': 'error',
    'prefer-const': 'warn',
    'prefer-arrow-callback': 'warn',
    'no-duplicate-imports': 'warn',

    // Expo/React Native 최적화
    // 'react-native/no-unused-styles': 'off', // eslint-plugin-react-native 미설치 시 주석
    // 'react-native/no-inline-styles': 'off',
  },
  overrides: [
    {
      files: ['supabase/functions/**/*.ts'],
      rules: {
        // Deno Edge Function URL import는 Node resolver 기준에서 false positive가 발생함
        'import/no-unresolved': 'off',
        // 레거시 함수 파일의 @ts-nocheck는 별도 리팩터 단계에서 정리
        '@typescript-eslint/ban-ts-comment': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'build/',
    'dist/',
    '.expo/',
    '.expo-shared/',
    'android/',
    'ios/',
    '*.config.js',
    '*.config.ts',
    'babel.config.js',
    'metro.config.js',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
};
