# Consola admin — apartados, usuarios y endpoints

> **App:** web-app-smart-palm (desk agrónomo + consola admin)  
> **API base:** `/api/v1`  
> **Entrada admin:** `/auth/login/admin` (oculta; no enlazada desde el login normal)  
> **Rol requerido:** `Administrator`  
> **Seed local:** `admin` / `admin`

Auth en casi todas las llamadas: `Authorization: Bearer <JWT>`.

---

## Acceso a la consola

| | |
|--|--|
| **Qué hace** | Entra a la consola de plataforma |
| **Para quién** | Solo **Administrator** |
| **Endpoint** | `POST /authentication/sign-in` body `{ username, password }` |
| **UI** | `/auth/login/admin` → shell `/admin` |

---

## 1. Inicio (`/admin`)

| | |
|--|--|
| **Qué hace** | Guía visual hacia Usuarios, Productores y Campo e IoT |
| **Para quién** | Orientación del **admin** (no llama APIs de negocio) |
| **Endpoints** | Ninguno |

---

## 2. Usuarios (`/admin/users`)

| | |
|--|--|
| **Qué hace** | Lista cuentas y crea **Agrónomo** o **Palm grower** |
| **Para quién** | Crea usuarios **Agronomist** o **PalmGrower** (la UI no ofrece crear otro Administrator) |

| Acción UI | Método | Path | Body / respuesta |
|-----------|--------|------|------------------|
| Listar | `GET` | `/admin/users` | Array `{ id, username, email, fullName, role, status }` |
| Crear | `POST` | `/admin/users` | `{ username, password, email, fullName, role: "Agronomist" \| "PalmGrower" }` → **201** |

---

## 3. Productores (`/admin/growers`)

Designa lo que usará la **app móvil del agricultor** (PalmGrower): cuenta, plan, plantación propia, sensores y (opcional) agrónomo vinculado.

| Paso | Qué hace el admin | Para quién | Endpoints |
|------|-------------------|------------|-----------|
| **1. Cuenta** | Crea productor nuevo o elige uno existente | **PalmGrower** | `POST /admin/users` (`role: "PalmGrower"`) o listado vía `GET /admin/users` |
| **2. Plan** | Activa suscripción + pago | Ese **PalmGrower** | `POST /admin/subscriptions` `{ userId, planType }` → `POST /admin/subscriptions/users/{userId}/payments` `{ amount }` |
| **3. Plantación** | Crea predio **a nombre del productor** | Ese **PalmGrower** (dueño) | `POST /authentication/sign-in` con user/pass del grower (JWT **temporal**, no pisa sesión admin) → `POST /plantations` `{ name, hectares, address, coordinates }` con ese Bearer |
| **4. IoT** | Sector + gateway + dispositivo | Campo del **productor** | `POST /admin/plantations/{plantationId}/sectors` `{ iotDeviceMacAddress, sectorName }` · `POST /edge-gateways` `{ edgeMac, monitoringZoneId }` · `POST /edge-gateways/{gatewayMac}/iot-devices` `{ iotMac, plantationId }` |
| **5. Afiliar agrónomo** (opcional) | Vincula un agrónomo a esa plantación | **Agronomist** + plantación del **grower** | `POST /agronomists/plantation-affiliations` `{ agronomistId, plantationId }` |
| Listado al pie | Plantaciones de la plataforma | Vista admin | `GET /admin/plantations` |
| Planes del form | Catálogo | — | `GET /subscriptions/plans` |

### Nota de dominio (API)

`POST /plantations` asigna el dueño según el usuario del JWT. No hay `ownerUserId` en el create.  
Por eso el front, solo para ese POST, autentica al grower con su contraseña (indicada en el formulario) y no reemplaza la sesión del admin.

---

## 4. Planes y acceso (`/admin/access`)

| | |
|--|--|
| **Qué hace** | Elige un usuario (agro o grower) y le activa plan + pago |
| **Para quién** | **Agronomist** o **PalmGrower** (el select excluye admins) |

| Acción | Método | Path | Body |
|--------|--------|------|------|
| Lista usuarios (UI filtra sin admin) | `GET` | `/admin/users` | — |
| Catálogo planes | `GET` | `/subscriptions/plans` | Público |
| Crear suscripción | `POST` | `/admin/subscriptions` | `{ userId, planType }` |
| Registrar pago (activa acceso) | `POST` | `/admin/subscriptions/users/{userId}/payments` | `{ amount }` |

Sin suscripción activa (pago procesado), agrónomo y productor reciben **403** en endpoints con `[RequireActiveSubscription]`.

---

## 5. Campo e IoT (`/admin/field`)

| | |
|--|--|
| **Qué hace** | Setup técnico: plantación, sector, gateway, IoT |
| **Para quién** | Infra de plataforma / demo. Si se crea plantación aquí, el dueño es el **admin**. Para predio del agricultor usar **Productores**. |

| Acción | Método | Path | Body / notas |
|--------|--------|------|----------------|
| Listar plantaciones | `GET` | `/admin/plantations` | — |
| Crear plantación | `POST` | `/plantations` | JWT **admin** → owner = admin |
| Asignar sector | `POST` | `/admin/plantations/{id}/sectors` | `{ iotDeviceMacAddress, sectorName }` |
| Registrar gateway | `POST` | `/edge-gateways` | `{ edgeMac, monitoringZoneId }` |
| Registrar IoT | `POST` | `/edge-gateways/{mac}/iot-devices` | `{ iotMac, plantationId }` |

---

## Mapa rápido “para qué usuario”

| Apartado admin | Beneficia a |
|----------------|-------------|
| **Usuarios** | Crea **Agrónomo** y/o **Productor** |
| **Productores** | Paquete del **PalmGrower** (móvil) + opcional vínculo a un **Agrónomo** |
| **Planes y acceso** | Activa plan de un **Agrónomo** o **Productor** ya creados |
| **Campo e IoT** | Infra del **admin** (técnico); no reemplaza Productores |
| **Inicio** | Solo guía del **admin** |

---

## Flujo expo recomendado

```text
Admin (/auth/login/admin)
  ├─ Usuarios     → crear agrónomo (y/o productor suelto)
  ├─ Planes       → activar plan del agrónomo (si no se hizo en Productores)
  ├─ Productores  → cuenta grower + plan + plantación suya + IoT + afiliar agrónomo
  └─ Campo e IoT  → re-link / infra sin ownership de grower (opcional)

Fuera del admin:
  · Login normal  → desk agrónomo
  · App móvil     → productor con lo designado en Productores
```

---

## Referencias backend

- `webservice/docs/iam-api-validation.md` — users, subscriptions  
- `webservice/docs/end-to-end-domain-validation.md` — plantaciones, IoT, suscripción  
- `webservice/docs/sensordataprocessing-api-validation.md` — lecturas / umbrales (desk agrónomo)  
- Validación local: `scripts/admin-api-validate.mjs`, `scripts/admin-ui-sections.mjs`
