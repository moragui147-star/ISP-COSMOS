# ISP COSMOS – Sistema de Gestión ISP

Aplicación web de **Master Telecomuni** para la Unidad Residencial Cosmos (Bello, Antioquia):
contratos, planes, facturación automática cada 30 días, recaudo, cierre de caja, cartera,
tickets de soporte y portal del cliente. Persistencia en Google Cloud Firestore y despliegue en Netlify.

- **Aplicación:** https://bejewelled-rabanadas-a6a9ee.netlify.app/
- **Tablero JIRA:** https://moragui147.atlassian.net/jira/software/projects/SCRUM/boards/1
- **Diseño de pruebas (RTF3):** [`docs/rtf3/`](docs/rtf3/)

## Estado del Sprint 0 (10 – 24 oct 2026)

**Objetivo:** corte de cartera automático (HU-05) y base de pruebas estructurales.

| JIRA | Tipo | Descripción | Estado | Rama |
|---|---|---|---|---|
| SCRUM-30 | Tarea | Documento RTF3 corregido | Finalizado | `docs/SCRUM-30-rtf3` |
| SCRUM-31 | Tarea | Diagramas UML v1.1 | Finalizado | `docs/SCRUM-30-rtf3` |
| SCRUM-32 | Tarea | Grafos de flujo, V(G) y casos de prueba | Finalizado | `docs/SCRUM-30-rtf3` |
| SCRUM-33 | Tarea | Jest, Istanbul, ESLint y CI | Finalizado | `feature/SCRUM-33-configurar-pruebas` |
| SCRUM-12 | Historia | `normalizarContador()` | Finalizado | `feature/SCRUM-12-normalizar-contador` |
| SCRUM-13 | Historia | `ejecutarCorteMensual()` | Finalizado | `feature/SCRUM-13-corte-mensual` |
| SCRUM-34 | Tarea | Pruebas del corte (CP-35 a CP-43) | Finalizado | `feature/SCRUM-34-pruebas-corte` |
| SCRUM-11 | Historia | Campo `periodosDeuda` y migración | Finalizado | `feature/SCRUM-11-periodos-deuda` |
| SCRUM-41 | Tarea | Evidencias de pruebas | Finalizado | `feature/SCRUM-41-evidencias` |
| SCRUM-14 | Historia | Botón de corte en Cartera Vencida | En revisión | `feature/SCRUM-14-vista-cartera` |
| SCRUM-29 | Historia | Separar lógica en capas | En curso | — |

**Pruebas:** 42 aprobadas · cobertura 100 % de sentencias y ramas en `app/js/dominio` y `app/js/servicios` · ESLint sin errores (ver [`docs/evidencias/`](docs/evidencias/)).

## Estructura

```
app/                     Aplicación estática que publica Netlify
  index.html             Interfaz (vistas, controladores de UI)
  js/dominio/            Reglas de negocio puras (normalizarContador, hoyBogota…)
  js/servicios/          Servicios con dependencias inyectadas (ServicioCartera)
  js/app-modulos.js      Puente entre los módulos ES y index.html
tests/unit/              Pruebas Jest de caja blanca (un test por camino básico)
docs/rtf3/               Documento RTF3, diagramas UML y grafos de flujo
docs/evidencias/         Cobertura, ESLint y capturas E2E
.github/workflows/ci.yml Lint + pruebas en cada push y pull request
```

## Flujo de ramas

```
main      ← versiones estables (etiquetas v1.0, v1.1.0)
develop   ← integración del sprint
feature/SCRUM-<n>-<descripción>  ← una rama por historia o tarea de JIRA
docs/SCRUM-<n>-<descripción>     ← documentación
```

1. Crear la rama desde `develop` con la clave de JIRA: `git checkout -b feature/SCRUM-15-abonos-parciales develop`.
2. Commits con [Conventional Commits](https://www.conventionalcommits.org/es/) y la clave al final: `feat(recaudo): guardar saldo en abonos parciales (SCRUM-15)`.
3. Pull request hacia `develop`; el CI debe pasar (lint + pruebas con cobertura).
4. Al cerrar el sprint, `develop` se fusiona en `main` y se etiqueta la versión.

## Ejecutar

```bash
npm ci
npm run lint            # ESLint (complejidad ≤ 10)
npm test                # Jest
npm run test:coverage   # Jest + cobertura Istanbul (umbral 100 %)
```

Para abrir la app localmente: copiar `app/js/firebase-config.example.js` como `app/js/firebase-config.js`, pegar los datos del proyecto de Firebase y servir la carpeta `app/` (por ejemplo `npx serve app`).
