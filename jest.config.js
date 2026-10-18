// Configuración de Jest (SCRUM-33): pruebas unitarias con módulos ES y cobertura Istanbul.
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['app/js/**/*.js', '!app/js/firebase-config*.js', '!app/js/app-modulos.js'],
  coverageReporters: ['text', 'html', 'json-summary'],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};
