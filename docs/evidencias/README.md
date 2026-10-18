# Evidencias de pruebas y análisis estático (SCRUM-41)

| Evidencia | Archivo |
|---|---|
| Resultado de Jest: 42 pruebas, 100 % de sentencias y ramas | `resultado-pruebas.txt` |
| Reporte HTML de cobertura (Istanbul) | `cobertura-html/index.html` |
| ESLint antes del refactor: complejidad 13 en `ejecutarCorteMensual` | `eslint-antes-refactor.txt` |
| ESLint después del refactor (SCRUM-13): 0 problemas | `eslint-despues-refactor.txt` |
| Prueba de extremo a extremo del corte (Firestore simulado) | `capturas/` |

Reproducir: `npm ci && npm run lint && npm run test:coverage`.
