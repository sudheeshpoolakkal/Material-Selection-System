# Expanded material data

The local catalog has 21,663 records across six sources: 20,880 research observations, 81 supplier grade/product-form records and 702 MaterialRegistry references. The supplier records span 29 grades from the published Outokumpu Core, Supra and Forta PDF datasheets. Each record has density, tensile strength, yield strength, Young's modulus and thermal conductivity. Heat capacity, thermal expansion, electrical resistivity, magnetizability and elongation are retained where the tables supply them. These are stainless-steel grades, not a complete catalog of every material family.

## Source status

| Provider | Status | Required next input |
| --- | --- | --- |
| Outokumpu Core | 31 records across 14 grades imported | Project use authorized by owner confirmation, 2026-10-10 |
| Outokumpu Supra | 22 records across 8 grades imported | Project use authorized by owner confirmation, 2026-10-10 |
| Outokumpu Forta | 28 records across 7 grades imported | Project use authorized by owner confirmation, 2026-10-10 |
| MaterialRegistry | All 702 API records imported, snapshot 2026-10-10 | No API key required; project use authorized by owner |
| Ansys Granta MaterialUniverse | Project authorization confirmed; mapping prepared; zero records imported | Actual export and its column layout, or access credentials |
| Total Materia Horizon | Project authorization confirmed; mapping prepared; zero records imported | Actual Data Services export or API credentials |
| MatWeb | Project authorization confirmed; mapping prepared; zero records imported | Actual authorized export or access details |

The project owner confirmed on 2026-10-10 that teammates received authorization to use the discussed sources in this project. `server/data/source-authorizations.json` records that confirmation; the underlying agreements were not supplied. No additional authorization is requested here. Publisher copyright and applicable agreements remain in force; this project does not issue an open-data license for vendor content. Source PDFs, extracted tables and normalized bundles remain in the ignored download cache.

Granta's [data documentation](https://ansyshelp.ansys.com/public/Views/Secured/Granta/v261/en/Granta_Advanced_Materials_Rel_Notes/release_notes/data_adv_intro.html) describes licensed reference databases. A [published study using its alloy dataset](https://link.springer.com/article/10.1007/s40192-026-00459-0) identifies the dataset as proprietary. The public Granta tools found during this review are software/documentation, not an authorized public release of the full data. No third-party Granta dump was downloaded or treated as a licensed source.

Total Materia offers [structured CSV/JSON/SQL data delivery and a Horizon API](https://www.totalmateria.com/en-us/data-solutions/). No account, export or API credentials were supplied in this workspace. The team's authorization is accepted; access to the actual records is the remaining input. MatWeb's [ordinary license terms](https://www.matweb.com/reference/terms.aspx) are distinct from the team's authorization. None of these three vendors is presented as connected in the application.

## Manufacturer import

```bash
npm run data:manufacturers
```

Requires Python 3 and Poppler's `pdftotext`. Downloads public datasheets if needed, verifies pinned SHA-256 digests, normalizes only reviewed metric tables and imports three source bundles atomically. Refreshes preserve IDs. If a PDF changes, preparation stops for a source-table review rather than trusting a new layout. The source manifests are separate from the existing research-source manifest.

Reviewed pages: Core 8 and 10; Supra 6 and 8; Forta 9 and 12. The PDF pages were rendered and visually inspected against extraction. Product forms, standard exceptions and separate A5/A80 gauge lengths are retained. Forta wire-rod properties marked typical stay typical; no mechanical-test temperature is inferred where the table does not state one. Grade physical references at 20 degrees C stay distinct from specimen measurements.

Tensile ranges remain in `metadata.propertyBounds`. The SQL numeric value used for screening is the published lower limit; a 540-750 MPa interval therefore does not pass a 600 MPa minimum. The detail, library, comparison and CSV export show the range or minimum and disclose screening semantics. Missing values are absent; costs, generic corrosion scores, certified manufacturing compatibility and service ceilings are not generated.

The library starts in Engineering grades when supplier/reference data is available. Research data and All records remain accessible. Evidence labels distinguish supplier/reference data from measured experimental and computed data.

## MaterialRegistry integration

The [API documentation](https://www.materialregistry.com/docs/api) describes a free public API with no authentication and a limit of 100 requests per minute per IP. Its materials endpoint includes properties and standards in the list response, so eight requests of 100 rows retrieve the complete 702-record snapshot without 702 separate detail calls. The import verifies consistent totals/offsets, complete pages, stable IDs and raw SHA-256 hashes before preparing a bundle. Requests are spaced 0.8 seconds apart; curl retries transient failures and rate limits, honoring Retry-After. Failed downloads or validation retain the previous complete cached snapshot.

```bash
# Prepare cached or newly downloaded data and import it into MySQL
npm run data:registry

# Fetch a complete updated snapshot, then import
npm run data:registry:prepare -- --refresh
node server/scripts/import-catalog.js server/data/downloads/material-registry/catalog.json

# Verify and normalize the cached snapshot without network requests
npm run data:registry:prepare -- --offline
```

Requires Python 3 and curl. Cache files remain ignored; `server/data/material-registry-manifest.json` records the source identity, page checksums, snapshot checksum definition, counts and normalization digest. Refreshes preserve IDs and project references. As with other sources, records omitted from a refresh are retained until separately reviewed for retirement.

| Property | Registry records |
| --- | ---: |
| Density | 702 |
| Tensile strength | 599 |
| Yield strength | 424 |
| Elastic modulus (method unspecified) | 141 |
| Thermal conductivity | 26 |
| Elongation (gauge unspecified) | 547 |
| Hardness, with separate scales | 289 |
| Melting point | 97 |
| Electrical conductivity (% IACS) | 1 |

The 14 native categories map to Metal (547), Polymer (71), Composite (29), Ceramic (26) and Elastomer (29). Native categories, original property objects, tags, ISO groups and all supplied standard codes are retained in metadata. Grade codes and aliases are indexed into searchable text, so 1.4301, SUS304 and S30400 find Stainless Steel 304. Designations appear in details, comparisons and CSV. They do not establish equivalence for a particular application or replace checking standards.

All 2,827 source-property citation fields are empty in this snapshot. The API supplies no product forms, test temperatures, gauge lengths, mechanical test methods or measured/minimum/typical evidence basis. Values are explicitly labeled as registry references with unspecified basis. Registry records stay separate from supplier/test observations; no property gaps are filled by joining on a grade name. The registry reports one aluminum A380 property as `undefined` (159 MPa): it remains in original metadata and is excluded from screening. No identity or measurement type is guessed.

Density units kg/m³ and g/cm³ normalize to g/cm³; elastic modulus MPa normalizes to GPa. HB, HRC, HRB, HV, Rockwell R/M and Shore A/00 remain distinct. Registry elongation is not relabeled A5 or A80; unspecified elastic modulus is not relabeled as a measured Young's modulus. Melting point is not mapped to a service ceiling. Costs and corrosion ranks are not inferred from descriptions.

The publisher describes the service as open data, but its Terms URL returned 404 and its GitHub link led to the GitHub homepage. No specific open-data license was identified. Project use proceeds under the owner's confirmation of team authorization, with publisher attribution retained.

## Authorized vendor exports

The CSV normalizer takes a mapping tailored to the actual export. Examples under `docs/import-mappings` are templates, not claims about vendor-native column layouts. License and rights-reference fields start blank because each export has its own terms. Use the owner confirmation as the project authorization reference and record the applicable export agreement when mapping the actual file. It preserves stable record IDs, distinct product forms/conditions, source URLs, evidence basis and original property bounds. It does not authenticate to a vendor, buy subscriptions, scrape restricted sites, validate a claimed legal entitlement or merge unrelated material conditions.

```bash
npm run data:prepare-export -- \
  --input /absolute/path/authorized-export.csv \
  --mapping /absolute/path/completed-mapping.json \
  --output server/data/downloads/authorized-source.json

node server/scripts/import-catalog.js server/data/downloads/authorized-source.json
```

Units must be explicit. Supported conversion examples include kg/m3 to g/cm3, psi/ksi to MPa, GPa to MPa, MPa to GPa, temperature K/F to C and resistivity to micro-ohm metres. Density intervals use the upper bound for mass screening; other numeric screening properties use the lower bound. Invalid values, reversed intervals, unknown units, duplicate source IDs, missing provenance and missing evidence labels fail preparation. Keep licensed inputs/mappings under ignored local directories when they include confidential information.

## Validation

Run the API suite, source preparation tests, opt-in MySQL integration suite and client build:

```bash
npm test
python3 server/tests/source-exports.test.py
python3 server/tests/ingestion.test.py
python3 server/tests/registry-sources.test.py
RUN_MYSQL_TESTS=true node --test server/tests/mysql.integration.test.js
npm run build
```

The source tests check 81 records and 29 grades, known table values, product-form differences, preserved tensile ranges, missing entries, typical versus specified values, citations and unit conversions. The new API test checks engineering/research filtering before pagination and counts. Browser access to the local app was denied earlier in this chat; no workaround was used, and this update's rendered UI has not been browser-verified.

Verified on 2026-10-10: 15 regular API tests passed (the optional MySQL case was skipped in that run); the opt-in live MySQL case passed separately; 5 registry snapshot/normalization tests, 4 supplier/export tests and 3 research-ingestion tests passed. The production client compiled successfully. Live preview checks found 21,663 records across six sources and 783 engineering references over eight pages at limit 100. All 702 registry records survived a verified reimport with unchanged IDs. Grade-code lookup for 1.4301, SUS304 and S30400 returned Stainless Steel 304 with density 7.93 g/cm³ and Brinell hardness 201 HB, without relabeling it Vickers or its elongation A5. SUS304 selection with minimum tensile 500 MPa and maximum density 8 g/cm³ returned two registry candidates. Polymer, composite, ceramic and elastomer counts matched the source snapshot. Homepage, library, selection and comparison routes and the compiled JavaScript asset returned HTTP 200. These HTTP checks do not establish visual/browser correctness.
