# Starbase · Material Selection System

An engineering material selection workspace backed by **MySQL**. The running app reads material records, properties, source citations and categories from relational tables. It does not load a hard-coded material list or fall back to SQLite.

NASA, Materials Project, AFLOW, NOMAD and Alexandria acquisition status, exact imported scopes, licenses, source failures and repeatable commands are documented in [the acquisition report](docs/data-acquisition-report.md). Source record totals do not imply complete commercial-grade specifications.

The public homepage at `/` introduces Starbase and leads into the workspace at `/materials`. The public pages at `/about` and `/brand` explain the product and provide the Starbase identity, downloadable SVG logos, and a brand kit. The workspace uses top navigation and responsive layouts for exploration, selection, comparison and projects. See [the product redesign record](docs/product-redesign.md) for visual changes, browser validation and the hero asset prompt.

## Run locally

Use Node.js 22.13 or newer (tested with Node 24). Configure `server/.env` from `server/.env.example` with your MySQL host, port, database and application credentials.

```bash
npm run setup
npm run data:download
npm run data:import
npm run data:registry
npm run dev
```

Create an empty MySQL database before importing:

```sql
CREATE DATABASE material_optimization_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Give a dedicated application user access to that database. Tables and additive schema migrations are created automatically. Material data is imported **only by the explicit import command**, never at application startup. If MySQL is unavailable, startup fails with a clear connection error; no substitute catalog is served.

Open [localhost:3000](http://localhost:3000). The development frontend proxies `/api` to the API on port 5000. Exploration, selection and comparison work without signing in; projects and saved selections require an account.

### The local database prepared in this workspace

An isolated **MySQL Community Server 8.4.11** is installed under `.runtime/mysql`, with data under `server/database/mysql`. It listens only on `127.0.0.1:3307`. Its generated application credentials are in the ignored `server/.env` file. No system packages or services were changed. Start it in a separate terminal before the app:

```bash
npm run db:start
```

The runtime, credentials, database files and source downloads are excluded from Git. These local files are not included in a fresh clone; use your own MySQL installation there. The original SQLite file and previous `.env` configuration (under `.runtime/original-server.env`) are retained as local archives, and are not used by the app.

For a built preview:

```bash
npm run build
npm start
```

This serves the frontend and API together on loopback port 3000. `PORT=3100 npm start` selects another port. `STARBASE_HOST` (or the legacy `MATERIA_HOST`) explicitly overrides the bind address. Set a persistent `JWT_SECRET`; production requires it. Do not commit secrets or local database files.

## Downloaded data and evidence

The prepared catalog contains **21,663 source records**: **20,880 research records**, **81 supplier grade/product-form records across 29 stainless-steel grades**, and **702 MaterialRegistry engineering references**. Registry data spans 14 categories, grouped into metals, polymers, composites, ceramics and elastomers. The library starts with 783 engineering records; research records remain in a separate collection. See [expanded data and vendor access status](docs/data-acquisition.md).

| Source | Records | Evidence and available properties |
| --- | ---: | --- |
| [NIST JARVIS-DFT elastic benchmarks](https://pages.nist.gov/jarvis_leaderboard/AI/SinglePropertyPrediction/dft_3d_bulk_modulus_kv/) | 19,335 | Computed crystalline-material bulk and shear moduli, in GPa |
| [Borg et al., Scientific Data 7, 430 (2020)](https://doi.org/10.1038/s41597-020-00768-9) | 1,545 | Literature-curated alloy observations with processing, test type, temperature, density and available mechanical properties |
| Outokumpu Core / Supra / Forta | 81 | Supplier values with product forms, ranges, property temperatures and source pages |
| [MaterialRegistry public API](https://www.materialregistry.com/docs/api) | 702 | Grade cross-references; 702 densities, 599 tensile strengths, 424 yield strengths, 141 elastic moduli and 26 thermal conductivities. Test conditions and underlying property citations absent. |

Source files are downloaded from the publishers' official repositories: [NIST](https://github.com/usnistgov/jarvis_leaderboard) and [the alloy dataset authors](https://github.com/CitrineInformatics/MPEA_dataset). NIST data is pinned to a repository revision. All input files are SHA-256 verified, and `server/data/sources-manifest.json` records source URLs, licenses, checksums, versions and imported counts. `server/scripts/prepare-sources.py` downloads and normalizes the sources using Python's standard library. A failed checksum requires inspecting the source update before changing the pinned manifest.

These are **source records, not 20,880 distinct commercial grades**. NIST benchmark exports identify crystals by their original `JVASP` accession; chemical formulas are not supplied by those exports. Experimental records may describe different tests or processing conditions of the same alloy. Computed and experimental data are labeled separately, and calculated density/modulus in experimental records is also labeled per property.

Missing values remain unknown. This import supplies **303 tensile-strength observations**; other alloy records may contain compression tests or only hardness/yield data. Compression strength is never mapped to tensile strength. Test temperature is never mapped to a service-temperature ceiling. Elastic stiffness is not tensile strength. Negative/non-positive NIST moduli are omitted, and records with neither positive modulus are excluded.

Prices, cost tiers, corrosion ratings, thermal conductivity, certified manufacturing compatibility, applications and service limits are not supplied by these two research sources. The additional supplier sources supply mechanical and thermal data with explicit conditions. Requiring unavailable data excludes candidates. Project use of the discussed sources was authorized by the owner on 2026-10-10, recorded in `server/data/source-authorizations.json`. Granta, Total Materia and MatWeb exports can be normalized through the mapped importer; no records from those three providers are included yet because exports or API credentials have not been supplied.

Supplier datasheets are prepared using `npm run data:manufacturers` under the team authorization reported by the project owner. Publisher copyright and applicable agreements remain in force. PDF/table caches are ignored by Git. Preparation requires Python 3 and Poppler's `pdftotext`.

Use `npm run data:registry` to prepare and import the MaterialRegistry snapshot (Python 3 and curl). The API requires no authentication and documents 100 requests/minute per IP; preparation spaces requests and retries transient failures. Use `npm run data:registry:prepare -- --refresh` followed by the bundle importer to fetch an updated snapshot, or `--offline` to verify cached pages. Checksums, pagination completeness, coverage and source limitations are recorded in `server/data/material-registry-manifest.json`. The publisher describes open data, but its Terms link returned 404 and GitHub link pointed to the GitHub homepage during review; no specific open-data license is claimed. This project relies on the owner-confirmed authorization.

Registry melting points are separate from service ceilings; unspecified elongation is separate from A5/A80 and elastic modulus remains method-unspecified. Hardness scales remain separate. One undefined source property is retained in metadata but excluded from screening. International designations are searchable (for example `1.4301`, `SUS304`, `S30400`) and visible in details, comparisons and CSV exports. Records from different sources are kept separate even when grade names overlap.

### Imports and refreshes

```bash
# Download missing files and verify source checksums
npm run data:download

# Normalize cached source files without a network request
python3 server/scripts/prepare-sources.py --offline

# Import into MySQL
npm run data:import

# Import an additional normalized source bundle
node server/scripts/import-catalog.js /absolute/path/to/source.json
```

Each source is imported atomically. Upserts use `(source_id, external_id)` and preserve internal material IDs, so repeated imports do not duplicate records or invalidate saved references. Refreshing a record replaces its property values with the current source values. Records omitted from a later import are retained; source retirement/deletion requires a separate reviewed migration. Existing legacy unsourced entries are retained in the database but excluded from the active catalog. The old 16-material JSON is now used only as an isolated test fixture.

An additional bundle has a `source` object containing `key`, `name`, HTTPS `url`, `license`, `kind` (`experimental`, `computed`, or `literature-extracted`), `version`, `checksum` and `note`, plus a `materials` array. Each material needs `externalId`, `name`, `category`, HTTPS `sourceUrl`, optional `description`, a `properties` object using the keys in `server/services/catalog.js`, and optional `metadata` for conditions and property evidence. Importer validation rejects duplicate IDs and invalid property values.

## Selection and comparison

- The library uses SQL search, source/evidence/family filters, numeric sorting and pages of 24 records. Counts and categories come from MySQL. Exports contain the displayed page and its provenance.
- Selection screens the full imported catalog against explicit constraints. Required missing properties exclude a candidate. A mass limit requires volume and reported density.
- Scoring uses min–max bounds over the full catalog, independent of filters. Strength, conductivity and bulk modulus are maximized; density and relative cost are minimized. User priorities are normalized. Missing weighted properties contribute zero and are disclosed; a record with no data for any active priority is excluded.
- The API shows the top 50 ranked matches and up to 100 exclusion examples, while reporting full match/exclusion counts. Saved projects retain the top 50 with their requirements and explanations.
- Comparison fetches the selected records directly by database ID, including selections from other pages. It supports four records and CSV export with source citations.
- No community ratings or fabricated reviews are used for ranking. Scores express preferences, not design certification or probabilities.

The crystalline stiffness scenario sets a bulk-modulus priority and selects computed data. Strength/density charts display only records with both reported properties. Cost/conductivity/corrosion scenarios need an additional source supplying those properties. Component mass is `density (g/cm³) × volume (cm³) / 1000` kg. Final design work requires relevant material conditions, test methods, safety factors and validated grade data.

## Relational model and API

`Users`, `Projects`, `Collaborators`, and `Material_Specs` store accounts and collaboration. `Material`, `Material_Category`, `Property`, `Material_Property`, and `Data_Source` store the catalog. Material metadata retains source record identity, citation and experimental conditions. Application and manufacturing association tables are present for supported future sources. `Project_Requirement`, `Recommendation`, and `Search_History` preserve selections.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | MySQL readiness and catalog coverage |
| GET | `/api/materials/summary` | Record counts, categories, sources, evidence types and property coverage |
| GET | `/api/materials?q=&category=&source=&kind=&collection=&property=&sort=&page=&limit=` | Paginated SQL material search; collection and reported-property filters; maximum page size 100 |
| GET | `/api/materials/:id` | Source-linked material and properties |
| GET | `/api/materials/categories`, `/api/materials/applications` | Database-derived taxonomy |
| POST | `/api/materials/recommend` | Constraints and priorities → bounded ranked results |
| GET / PUT | `/api/projects/:id/selection` | Load / atomically save project requirements and the top 50 recommendations |
| GET / POST | `/api/projects` | Accessible projects / create project |
| GET / PUT / DELETE | `/api/projects/:id` | Detail / rename / owner-only delete |
| POST / DELETE | `/api/projects/:id/specs[/:specId]` | Legacy mass/budget specifications |
| POST / DELETE | `/api/projects/:id/collaborators[/:userId]` | Owner-managed collaboration |
| POST | `/api/auth/register`, `/api/auth/login` | Account access |
| GET | `/api/auth/me` | Validated current account |
| PUT | `/api/auth/profile`, `/api/auth/change-password` | Account settings |

Read collaborators can inspect saved selections; write/admin collaborators can update them. Only owners manage collaborators and delete projects. Public registration cannot create administrators.

## Validation

```bash
npm test
python3 server/tests/ingestion.test.py
python3 server/tests/source-exports.test.py
python3 server/tests/registry-sources.test.py
RUN_MYSQL_TESTS=true node --test server/tests/mysql.integration.test.js
npm run build
```

The regular API tests use a disposable in-memory SQLite adapter and synthetic legacy fixtures strictly inside `server/tests`; SQLite is inaccessible as a runtime fallback. The ingestion checks use the downloaded, pinned source snapshots. The opt-in MySQL integration suite checks actual imported counts and coverage, stable IDs on reimport, pagination, parameterized search, evidence labels, missing-data exclusion, computed-stiffness screening and bounded API results. Run it only against this prepared source snapshot; it reimports the NIST bundle without deleting user/project data.
