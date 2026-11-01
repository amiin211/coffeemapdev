import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'node_modules/**', '3d/**', 'public/**', 'next-env.d.ts'] },
  { files: ['scripts/**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
];

export default eslintConfig;
