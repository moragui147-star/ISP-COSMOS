// Análisis estático (SCRUM-33): complejidad ciclomática máxima 10 (CA-17)
// y detección de código inalcanzable o variables sin uso.
export default [
  { ignores: ['app/js/firebase-config*.js', 'coverage/**', 'docs/**'] },
  {
    files: ['app/js/**/*.js', 'tests/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      complexity: ['error', { max: 10 }],
      'no-unreachable': 'error',
      'no-unused-vars': 'error',
      'no-undef': 'off',
      eqeqeq: ['error', 'always'],
      'max-depth': ['warn', 4],
    },
  },
];
