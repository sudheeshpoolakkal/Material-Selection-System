# Material Selection Recommendation System — Implementation Plan

## 0. Stack — decided, not inherited

React (Vite) frontend, Node.js + Express REST API, Sequelize ORM, MySQL 8.4. This isn't the original PPT's choice left unexamined — it's the outcome of weighing it against raw SQL / Knex / Prisma for the backend and plain HTML for the frontend. Two conditions attached to it:

- Sequelize connection runs with `logging: console.log` in development so the actual generated SQL is visible to the whole team, not hidden behind the ORM.
- The recursive tree queries (category tree, process tree) and the recommendation ranking query are raw SQL via `sequelize.query()`, not the Sequelize query builder — these are the parts of the project that demonstrate real database design skill and shouldn't be abstracted away.

## 1. Where things actually stand

| Module (from your original design) | Schema status | What's still missing |
|---|---|---|
| 1. User & Project Management | Done — `users`, `applications`, `selection_projects`, `search_history` | Sequelize models, JWT auth middleware, register/login endpoints, React auth pages |
| 2. Requirement Management | Done — `units`, `properties`, `application_properties`, `project_requirements` | Requirement-builder API and UI |
| 3. Material Database | Done — `material_categories` (tree), `manufacturing_processes` (tree), `materials`, `material_properties`, `material_processes`, `material_costs`, `data_sources`, `process_property_ranges` | Bulk import of the Kaggle datasets into real rows; browse/search UI |
| 4. Recommendation Engine | Query logic validated (filter + normalize + `RANK()`), not yet wrapped in an API endpoint | Service layer that runs the query, persists results |
| 5. Recommendation & Comparison | Done — `recommendations`, `recommendation_property_matches` | Comparison endpoint (stateless — see §4); results UI |

Nothing structural is missing from the database. What's left is implementation: turning validated SQL into a running application. That's the bigger job, and the one that splits cleanly across four people if you divide along the table boundaries below rather than "frontend person / backend person."

## 2. Architecture

```
React (Vite)  →  Axios  →  Express REST API  →  Sequelize ORM  →  MySQL 8.4
                              │
                        JWT auth middleware
                        (bcrypt password hashing)
```

Repo layout — one repo with `/client` and `/server`, or two repos, pick one before anyone starts writing code:

```
server/
  config/           database.js, env loading
  migrations/        one file per table, generated from the .sql schema
  models/             Sequelize model per table
  controllers/         one per module (auth, projects, requirements, materials, recommendations)
  routes/               maps URLs to controllers
  services/              recommendationEngine.js — the filter/normalize/rank query as a function
  middleware/             auth.js (JWT verify), errorHandler.js
  seed/                    seed.sql (your existing file) + a CSV-import script
  app.js

client/
  src/
    pages/            one folder per module — Login, Projects, Requirements, Materials, Recommendations
    components/         shared UI (MaterialCard, ScoreBar, CategoryTree, ProcessTree)
    api/                  one file per module, wraps Axios calls
    context/               AuthContext (holds the JWT + current user)
```

## 3. Team ownership — mapped to actual tables, endpoints, and pages

| Person | Owns these tables | Owns these endpoints | Owns this UI |
|---|---|---|---|
| **A — User & Project** | `users`, `selection_projects`, `search_history` | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/users/me`, `POST /api/projects`, `GET /api/projects`, `GET /api/projects/:id`, `PUT /api/projects/:id`, `DELETE /api/projects/:id` | Login/Register, Project dashboard, Project creation flow |
| **B — Requirements** | `applications`, `properties`, `application_properties`, `project_requirements`, `units` | `GET /api/applications`, `GET /api/applications/:id/properties`, `POST /api/projects/:id/requirements`, `GET /api/projects/:id/requirements`, `PUT/DELETE /api/projects/:id/requirements/:reqId` | Requirement builder — pick an application, see its default properties pre-loaded, set targets and weights |
| **C — Material Database** | `material_categories`, `manufacturing_processes`, `materials`, `material_properties`, `material_processes`, `material_costs`, `data_sources`, `process_property_ranges` | `GET /api/categories` (tree), `GET /api/materials`, `GET /api/materials/:id`, `GET /api/materials/compare?ids=1,2,3`, `GET /api/processes` (tree) | Category tree browser, material list/search, material detail page, comparison view |
| **D — Recommendation Engine** | `recommendations`, `recommendation_property_matches` | `POST /api/projects/:id/recommendations/generate`, `GET /api/projects/:id/recommendations`, `GET /api/recommendations/:id` | Ranked results page with per-property matched/failed breakdown |

Two shared decisions before writing code, so nobody builds against an assumption someone else changes later:

- **Comparison stays stateless.** `GET /api/materials/compare?ids=1,2,3` reads live rows from `material_properties` — no dedicated `Comparison` table. Your original design lists comparison as a capability, not something to persist; don't build storage you don't need.
- **Recommendation generation writes to the database, not just JSON back to the client.** `POST /api/projects/:id/recommendations/generate` runs the ranking query, then `INSERT`s into `recommendations` and `recommendation_property_matches` before responding. That's what makes `search_history` and "view past recommendations" work at all, and it's the actual distinction between Module 4 (compute) and Module 5 (persist and explain) in your own design.

## 4. Build order

Not calendar weeks — you know your real deadline, this doesn't. Compress or stretch each phase against it.

1. **Foundation.** Repo scaffolding, `.env` config, Sequelize connection with `logging: console.log` on, run the schema, confirm all four people can connect to the same database.
2. **Models + auth.** One person builds the Sequelize models for every table in one pass (fastest as a single effort, then hand associations to their respective owners), ships register/login with JWT. Nobody else can build a real endpoint until this exists.
3. **Parallel CRUD.** B, C, D build their owned endpoints against the working models — the table split in §3 is what makes this genuinely parallel instead of one person's branch blocking three others.
4. **Recommendation engine.** D wires the raw-SQL ranking query into `POST /.../recommendations/generate`. Hard dependency on B and C's endpoints existing (reads `project_requirements` and `material_properties`), so it lands after phase 3 naturally.
5. **Frontend integration.** Each person builds the UI for their own module against their own already-working API.
6. **Cross-module glue.** The parts nobody owns individually — importing the Kaggle CSVs into real rows, the comparison view, a styling pass, and rehearsing the end-to-end demo flow (register → create project → pick application → set requirements → get ranked recommendations).

## 5. Testing and demo prep

No formal test suite needed for a course project, but don't discover a broken join the night before the demo:

- Keep a Postman/Thunder Client collection with one saved request per endpoint in §3 — cheaper than integration tests, catches the same bugs.
- Rehearse against the Heat Sink example already seeded in the schema (thermal conductivity ≥ 150 W/mK, density ≤ 3000 kg/m³) — a known-good query path, already validated at the SQL level.
- Re-run the bulk import from the Kaggle dataset before the demo so the material list looks like a real catalog, not seven rows.

## 6. Decide this before anyone opens an editor

- Leaf-only vs. family-level process tagging in `material_processes` (flagged two turns ago) — affects how Person C's material detail page renders process compatibility.
- Where this gets deployed for the demo — localhost is fine unless deployment is separately graded; don't spend time on hosting otherwise.
- Confirm every team member can actually see Sequelize's generated SQL in their own dev environment before phase 2 starts — the whole point of §0's condition is void if only one person turns logging on.
