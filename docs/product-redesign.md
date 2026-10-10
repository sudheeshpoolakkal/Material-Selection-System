# Materia product-site redesign

The public entry point is now `/`. It introduces Materia, explains exploration, screening and comparison, and leads into the existing workspace at `/materials`. The application uses a full-width layout with top navigation in place of the fixed sidebar.

The library opens in a table view, with family filters, search, sorting, source and evidence filters, pagination, and an optional grid. Repeated slogans, decorative specimen illustrations, tiny record codes and secondary captions have been removed. Selection, comparison, projects, methodology and account screens share the updated typography, spacing, buttons and responsive navigation.

## Validation

- Production build completes successfully.
- Existing integration suite: 13 passed, 1 optional MySQL integration test skipped. Tests use their disposable SQLite fixture.
- Live MySQL browser checks: 20,880-record catalog; pagination; source-ID search; list/grid views; material-detail dialog; add/remove comparison; two-record comparison; computed-stiffness scenario; ranking-method dialog; project sign-in entry.
- Computed-stiffness scenario: 6,474 candidates, top 50 displayed, first result 100.0 preference score, with the actual source and constraint explanation.
- Desktop layout inspected at 1440 × 1000. Mobile homepage, menu, library, selection, comparison and methodology inspected at 390 × 844. The page does not overflow horizontally; property tables scroll inside their containers.
- Account forms inspected visually. The browser's previously saved test credentials were rejected; authenticated project editing was not exercised in this browser session. Account/project API behavior is covered by the existing regression suite.

## Hero asset

Final asset: `client/public/images/material-study.webp` (1536 × 1024, approximately 171 KB). Generated using the built-in imagegen tool, then encoded as WebP. The image illustrates material textures and is not a photograph of a catalog record or an engineering component.

Generation prompt:

> Use case: product-mockup. Create a premium industrial materials photography asset for the Materia engineering software homepage. Landscape 1536x1024. A sculptural arrangement of three large precision-engineered material samples: a sweeping bent sheet of brushed aluminum with fine horizontal machining grain, a curved dark woven carbon-fiber sheet behind it, and one solid satin titanium cylinder in the foreground. Composition tightly framed, dramatic monumental forms occupy the right two thirds, deep charcoal empty background to the left, dark charcoal tabletop. Sophisticated studio product photography, beautiful silver highlights, subtle warm reflections, deep shadows, physically realistic textures, crisp macro details, architectural composition. Restrained black and silver palette. No text, labels, logos, UI, graphics, watermarks, glowing neon, or people.

## Local review

The production preview is available at `http://localhost:3102/`, with the existing project-local MySQL instance on port 3307. These are local preview processes; this change does not publish the site to a public host.

## Missing-property follow-up

Checked the original MPEA CSV and normalized record `MPEA-row-1453`: it supplies experimental density 4.75 g/cm³ (and a separate calculated density), but no strength, modulus, hardness or test-temperature values. The importer retains the experimental density; blank mechanical fields are genuine gaps in the source observation.

Material details now list available properties and group absent source fields in one expandable section. Empty applications and speculative manufacturing fields no longer occupy the dialog. Grid cards use available properties; table columns follow the family, source, selected property and sort, with an explained dash for missing values. A new reported-property filter searches the complete SQL catalog before pagination.

Validation for this follow-up: production build succeeded; 14 tests passed, 1 optional MySQL test skipped. Live MySQL API checks verified 303 tensile records, 1,067 yield-strength records, 767 Young’s-modulus records and 19,326 bulk-modulus records, all with the requested value present. Record 1453 is excluded when tensile data is required. Browser access to the local preview was denied by the browser tool, so the updated rendering has not been visually verified; the screenshots above document the preceding redesign.

The subsequent [data expansion](data-acquisition.md) adds 81 supplier grade/product-form records, starts the library in Engineering grades when available, and keeps research records accessible separately. Source ranges and conditions appear in the detail, library, comparison, selection results and exports. New engineering-grade rendering has passed the client build but remains unverified in the browser because of the access denial.
