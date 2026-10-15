# 🏆 Sports Tournaments — FESJA 2026

Plataforma de gestión de torneos deportivos desarrollada como monorepo con **Nx**, utilizando **Angular** en el frontend, **Express** en el backend y **MySQL** como base de datos.

---

## 🧱 Arquitectura del Proyecto

```
sports-tournaments/
├── api/                            # Backend Express (librería Nx)
│   └── src/
│       ├── lib/
│       │   └── api.ts              # Lógica principal del servidor
│       └── index.ts                # Entry point de la librería
│   ├── eslint.config.mjs
│   ├── package.json
│   ├── project.json
│   ├── tsconfig.json
│   └── tsconfig.lib.json
│
├── src/                            # Frontend Angular
│   ├── app/
│   │   ├── app-routing.module.ts
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   └── app.module.ts
│   ├── assets/
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
│
├── nx.json
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.app.json
└── tsconfig.spec.json
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Angular | 16.x |
| Backend | Express | 5.x |
| Base de datos | MySQL | - |
| Monorepo | Nx | 20.x |
| Lenguaje | TypeScript | <5.2.0 |

---

## 🚀 Instalación

### Prerrequisitos

- Node.js >= 18.x
- npm >= 9.x
- MySQL instalado y corriendo

### 1. Clona el repositorio

```bash
git clone https://github.com/FesjArizona/Torneo-Fesja-2026
cd Torneo-Fesja-2026
```

### 2. Instala dependencias raíz

```bash
npm install
```

### 3. Instala dependencias del backend

```bash
cd api
npm install
cd ..
```

### 4. Configura las variables de entorno

Crea un archivo `.env` en la raíz basándote en el ejemplo:

```bash
cp .env.example .env
```

Edita el `.env` con tus credenciales:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mi_password
DB_NAME=sports_tournaments

# API
API_PORT=3000

# Angular
ANGULAR_PORT=4200
```

### 5. Crea la base de datos en MySQL

```sql
CREATE DATABASE sports_tournaments;
```

---

## ▶️ Correr el proyecto

### Desarrollo (Frontend + Backend simultáneamente)

```bash
npm run dev
```

Esto levantará:

| Servicio | URL |
|---|---|
| 🅰️ Angular | http://localhost:4200 |
| ⚙️ Express API | http://localhost:3000 |

### Solo el Frontend

```bash
npm run start
```

### Solo el Backend

```bash
npm run start:api
```

### Build de producción

```bash
npm run build
```

---

## 📡 API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api` | Health check de la API |
| GET | `/api/tournaments` | Lista todos los torneos |
| POST | `/api/tournaments` | Crea un nuevo torneo |
| GET | `/api/tournaments/:id` | Obtiene un torneo por ID |
| PUT | `/api/tournaments/:id` | Actualiza un torneo |
| DELETE | `/api/tournaments/:id` | Elimina un torneo |

> 📝 Los endpoints se irán expandiendo conforme avance el desarrollo.

---

## 🗄️ Base de Datos

El proyecto utiliza **MySQL** como motor de base de datos.

### Diagrama de tablas (planeado)

```
tournaments
├── id          INT (PK)
├── name        VARCHAR
├── sport       VARCHAR
├── start_date  DATE
├── end_date    DATE
└── status      ENUM('active', 'finished', 'pending')

teams
├── id              INT (PK)
├── name            VARCHAR
├── tournament_id   INT (FK → tournaments.id)
└── created_at      TIMESTAMP

matches
├── id              INT (PK)
├── tournament_id   INT (FK → tournaments.id)
├── team_home_id    INT (FK → teams.id)
├── team_away_id    INT (FK → teams.id)
├── score_home      INT
├── score_away      INT
└── match_date      DATETIME
```

---

## 🧪 Tests

```bash
npm run test
```

---

## 📦 Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Levanta Angular + Express en paralelo |
| `npm run start` | Solo Angular (puerto 4200) |
| `npm run start:api` | Solo Express (puerto 3000) |
| `npm run build` | Build de producción |
| `npm run test` | Corre los tests |

---

## 🤝 Contribución

1. Haz un fork del proyecto
2. Crea tu rama: `git checkout -b feature/nueva-funcionalidad`
3. Haz commit de tus cambios: `git commit -m 'feat: agrego nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es privado — todos los derechos reservados © FESJA 2026.
