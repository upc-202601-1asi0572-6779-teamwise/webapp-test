# Migracion Front a Backend Real (Agronomo)

> **Rama:** `feature/migrate-agronomist-backend-real`
> **Base URL:** `https://smart-palm-platform.onrender.com/api/v1`
> **Swagger:** `https://smart-palm-platform.onrender.com/index.html`
> **Alcance:** rol Agronomo. Migracion ordenada por fases.
> **Fecha inicio:** 2026-07-08

---

## 0. Objetivos y no-objetivos

### Objetivos

1. Dejar de depender del mock (`smartpalm-mock-api` / `localhost:3000`) para el flujo del agronomo.
2. Consumir los endpoints reales del backend .NET desplegado en Render.
3. Migrar por fases, verificando build/tests tras cada una, sin dejar datos o codigo sucio.
4. Mantener la UI usable: lo que el backend no soporta se oculta o se degrada con empty-state, no con 404 en cascada.

### No-objetivos (esta rama)

- Seguridad de grado produccion.
- Migrar rol PalmGrower completo.
- Implementar reportes / inspecciones / notificaciones si el backend no los expone.
- Editar la carpeta legacy `src/app/features/*` (duplicado; no es la fuente de verdad de rutas).

---

## 1. Principios de trabajo

| Principio | Aplicacion |
|---|---|
| Una fuente de verdad | Solo `src/app/<bc>/` (no `features/`) |
| Adapter en infra | DTO backend <-> dominio front via assembler/response |
| Feature flags | `environment.features.*` y `dataSource` |
| Demo controlado | `environment.demo` (plantationId, macs, agronomistId) |
| Sin half-mapping | Un servicio no mezcla shape mock y real a la vez |
| Verificacion por fase | `npm run build` (+ tests del BC tocado si existen) al cerrar cada fase |
| Commits logicos | Un commit por fase cuando el build pase |

---

## 2. Estado del backend (referencia)

| Grupo | Endpoints | Live (2026-07-08) |
|---|---|---|
| Recomendaciones | `/plantations/{id}/recommendations/*` | OK (sin auth en deploy actual) |
| Thresholds | `/devices/{mac}/thresholds` | OK |
| Lecturas | `/devices/{mac}/sensor-readings`, gateways readings | OK |
| Edge gateways | list / devices / connectivity | OK |
| Auth | `/authentication/sign-in` | ROTO (`users` table missing) |
| Alerts | `/alerts` | Bloqueado por auth/users |
| Plantations list | CropMonitoring | No desplegado |
| Reports / inspections / notifications | — | No existen |

---

## 3. Configuracion objetivo

```ts
export const environment = {
  production: false | true,
  apiUrl: 'https://smart-palm-platform.onrender.com/api/v1',
  dataSource: 'real' | 'mock',
  demoAuth: true, // mientras sign-in falle
  demo: {
    plantationId: 1,
    agronomistId: 1,
    deviceMac: '123456',
    gatewayMac: '12345',
  },
  features: {
    recommendations: true,
    sensors: true,
    iotStatus: true,
    alerts: false,
    reports: false,
    inspections: false,
    notifications: false,
    plantationsApi: false,
    subscriptionApi: false,
  },
};
```

---

## 4. Fases de implementacion

### Fase 0 — Cimientos (sin cambiar pantallas)

**Estado:** `done`

**Objetivo:** base de configuracion y utilidades. La app sigue compilando; los services de BC aun no cambian de contrato en esta fase.

**Cambios:**

1. `src/environments/environment.ts` y `environment.prod.ts`
   - `apiUrl` -> backend real
   - `dataSource`, `demoAuth`, `demo`, `features`
2. Utilidades compartidas:
   - `src/app/shared/infrastructure/location-id.util.ts` — parsear id de header `Location`
   - `src/app/shared/infrastructure/jwt.util.ts` — decodificar payload JWT (`sid`)
3. Ajustar `auth.interceptor.ts` para reconocer paths de auth reales (`/authentication/sign-in`, `/authentication/sign-up`) ademas de los mock si quedan.
4. Documentar en este archivo el checklist de verificacion.

**No hacer en Fase 0:** reescribir services de BC.

**Verificacion:**

```bash
npm run build
```

**Criterio de aceptacion:**

- [ ] Build OK
- [ ] Environments exportan la forma nueva
- [ ] Utils tipados sin errores TS

**Notas de ejecucion:** 2026-07-08 — environments apuntan a Render; utils location-id + jwt; interceptor con paths /authentication/*; `npm run build` exit 0.

---

### Fase 1 — AgronomicRecommendation (P0)

**Estado:** `done`

**Objetivo:** el BC de recomendaciones habla solo con el backend real.

**Contrato backend:**

| Accion | Metodo | Path |
|---|---|---|
| Listar | GET | `/plantations/{plantationId}/recommendations?status=&agronomistId=` |
| Detalle | GET | `/plantations/{plantationId}/recommendations/{id}` |
| Crear | POST | `/plantations/{plantationId}/recommendations` body `{ agronomistId, content }` |
| Editar content | PATCH | `.../recommendations/{id}` body `{ content }` |
| Aprobar | PATCH | `.../approval` |
| Publicar | PATCH | `.../publication` |
| List intervenciones | GET | `.../interventions` |
| Registrar intervencion | POST | `.../interventions` body `{ description, performedBy, executionDate }` |

**Cambios de codigo:**

1. Domain / response / assembler alineados a status `Pending|Approved|Published`, type `Manual`, campos content/fechas.
2. `recommendation-api.service.ts` reescrito a paths reales.
3. Captura de `id` desde `Location` en POST.
4. Store y vistas del agronomo:
   - list usa `environment.demo.plantationId`
   - form create envia `{ agronomistId, content }`
   - approve/publish usan PATCH
5. Intervenciones en detalle (minimo viable si faltan).
6. Reportes: respetar `features.reports === false` (no llamar mock roto).

**Gaps a manejar:**

- Listado sin `id` en body -> cache de ids post-create / deshabilitar detalle si no hay id.
- `plantationId` fijo desde demo hasta exista CropMonitoring.

**Verificacion:**

```bash
npm run build
npx ng test --watch=false --include=**/recommendation*.spec.ts
```

**Criterio de aceptacion:**

- [ ] Build OK
- [ ] Ninguna llamada a `/recommendations` plano del mock desde este BC
- [ ] Create/approve/publish usan paths reales

**Notas de ejecucion:** _(rellenar al implementar)_

---

### Fase 2 — Sensores + IoT status (P0/P1)

**Estado:** `done`

**Objetivo:** lecturas, umbrales y gateways reales para el agronomo / dashboard.

**Contrato:**

| Accion | Metodo | Path |
|---|---|---|
| Thresholds list | GET | `/devices/{device-mac}/thresholds` |
| Threshold update | PATCH | `/devices/{device-mac}/thresholds` |
| Readings device | GET | `/devices/{device-mac}/sensor-readings?from&to&page&size` |
| Gateways | GET | `/edge-gateways` |
| Gateway devices | GET | `/edge-gateways/{mac}/devices` |
| Connectivity | GET | `/edge-gateways/{mac}/connectivity` |

**Cambios:**

1. `sensor-reading.service.ts` -> path real + assembler a dominio front.
2. Servicio gateway para list/connectivity.
3. Thresholds API.
4. `CropMonitoringDashboardStore.loadAll()`:
   - con `dataSource === 'real'`, solo forkJoin de endpoints vivos
   - defaults vacios para APIs con flag off
5. Modelo device por MAC string en modo real.

**Verificacion:**

```bash
npm run build
```

**Criterio de aceptacion:**

- [ ] Build OK
- [ ] Dashboard agronomo no spamea 404 a `/readings` ni `/devices` mock
- [ ] Se pueden cargar thresholds y gateways reales

**Notas de ejecucion:** _(rellenar al implementar)_

---

### Fase 3 — Auth demo + interceptor limpio

**Estado:** `done`

**Objetivo:** la app entra como agronomo sin depender de sign-in roto, sin datos sucios en localStorage.

**Cambios:**

1. `AuthService`:
   - si `demoAuth`: sesion demo agronomo
   - shape de user consistente (`role: 'agronomist'`, id desde demo)
   - storage versionada o clear al cambiar dataSource
2. Adapter real a `POST /authentication/sign-in` preparado para cuando backend se arregle (`demoAuth: false`).
3. Interceptor: paths auth reales; no loops de login en demo.
4. Register/recover: mensaje no disponible si aplica.

**Verificacion:**

```bash
npm run build
```

**Criterio de aceptacion:**

- [ ] Build OK
- [ ] Guard auth permite entrar en modo demo como agronomo
- [ ] localStorage no mezcla shape mock viejo

**Notas de ejecucion:** _(rellenar al implementar)_

---

### Fase 4 — UI shell limpia (flags de features)

**Estado:** `done`

**Objetivo:** sidebar y rutas del agronomo solo muestran lo soportado.

**Cambios:**

1. Sidebar agronomo: ocultar Reportes / Inspecciones / Alertas / Notificaciones segun flags.
2. Dashboard: no invocar APIs deshabilitadas.
3. Plantaciones: lista demo de una plantacion (id=1) si `plantationsApi === false`.
4. Empty-states honestos en lugar de errores genericos.

**Verificacion:**

```bash
npm run build
```

**Criterio de aceptacion:**

- [ ] Build OK
- [ ] Navegacion agronomo no genera 404 masivos al backend
- [ ] Menu coherente con features flags

**Notas de ejecucion:** _(rellenar al implementar)_

---

### Fase 5 — Alertas (opcional)

**Estado:** `blocked` por tabla users

Activar solo si `GET /alerts?userId=` responde 200.

**Cambios:** reescribir `alert-api.service` + assembler; `features.alerts = true`.

---

### Fase 6 — Cleanup

**Estado:** `partial`

1. Revisar imports a paths mock en BCs migrados.
2. Actualizar este doc: fases `done` o `blocked`.
3. Nota de como flippear a mock si hace falta.
4. No borrar mock-api del monorepo en esta rama.

---

## 5. Mapa de archivos por fase

| Fase | Archivos principales |
|---|---|
| 0 | `environment*.ts`, `location-id.util.ts`, `jwt.util.ts`, `auth.interceptor.ts` |
| 1 | `agronomic-recommendation/infrastructure/*`, domain, store, views rec* |
| 2 | `sensor-reading.service.ts`, iot infra, dashboard store |
| 3 | `auth.service.ts`, auth models, login view (minimo) |
| 4 | `app-sidebar`, dashboard, plantation-list store |
| 5 | `alert-api.service.ts` |
| 6 | docs + cleanup flags |

---

## 6. Checklist de verificacion global (por fase)

Tras **cada** fase:

1. `npm run build` -> exit 0
2. No errores TS nuevos en archivos tocados
3. Si hay specs del modulo: correrlas
4. Actualizar **Estado** de la fase en este documento (`done` / `blocked` + notas)
5. Si algo falla: **fix antes de avanzar** a la siguiente fase

---

## 7. Log de progreso

| Fecha | Fase | Resultado | Notas |
|---|---|---|---|
| 2026-07-08 | 0 | done | build OK |
| 2026-07-08 | 1 | done | recommendations real API + build OK |
| 2026-07-08 | 2 | done | sensors + gateways + dashboard forkJoin |
| 2026-07-08 | 3 | done | demoAuth + storage v1 |
| 2026-07-08 | 4 | done | sidebar flags |
| 2026-07-08 | 5 | blocked | users/alerts tables |
| 2026-07-08 | 6 | partial | doc updated; mock-api kept offline |

---

## 8. Referencias

- Backend repo: `upc-202601-1asi0572-6779-teamwise/webservice`
- Docs previas: `docs/agronomist-flow.md`, `docs/agronomist-path.md`, `docs/backend-status.md`
- Front mock base: `smartpalm-mock-api` / `localhost:3000`


