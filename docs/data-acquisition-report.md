# Material data acquisition — 10 October 2026

The existing six sources remain in place. New records are imported using their
original accessions and source namespaces. They are observations or computed
crystals, not a claim that every entry is a distinct commercial material grade
with complete mechanical specifications.

| Source | Locally acquired | Imported records | Scope |
| --- | --- | ---: | --- |
| NASA Goddard outgassing | Complete legacy JSON | 12,859 | ASTM E595 sample observations; TML, CVCM, WVR and cure conditions |
| NASA TPSX | All 1,549 list entries; 1,545 detail pages | 1,545 | SI standard-condition tables, original properties, uncertainties, directional values and links to temperature data |
| Materials Project core | Full summary and elasticity Parquet snapshots | 154,377 | Non-deprecated core crystals; density, electronic/thermodynamic properties and available elastic moduli |
| Materials Project GNoME | Included in full summary snapshot | 116,948 | Separate source; non-commercial license retained |
| AFLOW | Complete available AEL/AGL query union | 5,664 | 5,639 elastic / 5,653 thermal query entries, combined by AUID |
| NOMAD | Complete public bulk/shear-modulus-tagged query | 120 | Published simulations, CC BY 4.0 verified per entry; original calculation and dataset IDs |
| Alexandria | All 59 published PBE 3D compressed archives | In progress | Every source entry is being normalized and checked for unique accessions before import |

The catalog before Alexandria contains **313,176 records across 12 sources**,
including the existing 21,663 records. Raw files are in the ignored
`server/data/downloads/open-sources` directory. SHA-256 values, normalized counts
and property coverage are recorded in
`server/data/open-sources-manifest.json` and the acquisition manifests.

## Access and capacity limits

- Four TPSX detail pages repeatedly return HTTP 500: 1519, 773, 1051 and 1258.
  Their list entries and failures are recorded, and missing values are not invented.
- Full JARVIS Figshare hosts are blocked by this machine's NextDNS filter. TLS
  verification and the filter were not bypassed. The existing 19,335 pinned
  JARVIS elastic benchmark records remain available.
- NIST Cryogenic and NIST Alloy Data return HTTP 403 to the downloader. Public
  documentation was reviewed, but no correlation values were fabricated from it.
- OQMD requests return HTTP 502. Its advertised 21.1 GB compressed SQL dump and
  roughly 100 GB MySQL installation exceed this workspace's available capacity.
- NASA MAPTIS needs registered access or an approved export. No credentials or
  export were supplied.
- NIMS MatNavi browsing terms prohibit mass acquisition/scraping. No approved
  bulk export was supplied, and no browsing-service scraping was attempted.
- Granta, Total Materia and MatWeb: the owner's authorization statement is
  retained; no actual export or configured credentials are present. Existing
  CSV import mappings are ready for those exports.

This acquisition does not claim to download all NOMAD calculations, AFLOW's
entire structural database, or Alexandria's separate PBEsol/SCAN/low-dimensional
collections. The selected property-bearing sets and PBE 3D archive are stated
explicitly rather than substituting providers' advertised totals.

## Data treatment

Outgassing percentages are not strength properties. Zero is a valid measured
TML/CVCM/WVR value; missing percentages cannot pass a hard limit. NASA sample IDs
are not unique, so original row accessions identify records. The selection page
includes a vacuum-outgassing preset with editable limits.

TPSX isotropic, in-plane and through-thickness conductivity remain distinct.
Reusable and single-use temperature limits have their own fields, and are not
silently assigned to the general service-temperature field. Source uncertainties,
STP flags, unsupported properties and original references remain inspectable.
The material pages link original temperature curves; those secondary curve pages
are not claimed to be bulk-imported.

Computed Voigt and Voigt–Reuss–Hill moduli remain distinct. Formation energies
and band gaps do not become tensile strengths. Deprecated Materials Project
entries remain in the raw files and are excluded from screening. There are
8,834 such summary records in this snapshot. Core and GNoME source records are
kept separate using publisher `builder_meta.license` values.

Alexandria's non-standard `NaN` tokens are accepted only by the source reader;
non-finite values are excluded from selectable properties. Chemical formula
strings such as `NaNbO3` are preserved. Density is derived from the relaxed cell
composition and volume, using pymatgen atomic masses and the exact Avogadro
constant, and explicitly labeled as derived from a DFT unit cell. The original
structures remain in the downloaded archives.

Large imports use bounded JSONL batches and stable `(source_id, external_id)`
upserts. Source summary snapshots avoid recomputing every coverage count on
each page load. Recommendations screen and rank in SQL, fetch at most 50 full
candidate records, and retain global normalization bounds. Tests compare this
ranking with the original in-memory calculation.

## Reproduction

Create the local data-tool environment once:

```bash
python3 -m venv .runtime/data-tools
.runtime/data-tools/bin/pip install -r server/scripts/requirements-open-data.txt
```

For each source, acquire its snapshot, normalize it, then import its output.
The available acquisition names are `outgassing`, `tpsx`, `materials-project`,
`aflow`, `nomad`, and `alexandria`. Normalization names are the same.

```bash
npm run data:open:acquire -- nomad
npm run data:open:prepare -- nomad
node server/scripts/import-catalog.js server/data/downloads/open-sources/nomad-elastic.json

npm run data:open:acquire -- materials-project
npm run data:open:prepare -- materials-project
node server/scripts/import-catalog.js server/data/downloads/open-sources/materials-project-core.jsonl
node server/scripts/import-catalog.js server/data/downloads/open-sources/materials-project-gnome.jsonl
```

TPSX acquisition exits nonzero if detail requests fail, while preserving successful
pages and a failure manifest. Its normalizer imports only available detail pages
and writes a separate missing-record report. Repeated imports preserve existing
IDs and project references. JSONL batches commit independently; if interrupted,
rerun the same full snapshot to complete the source. A partial import is not a
verified complete source until its imported count matches the manifest.

The acquisition ledger is `server/data/additional-sources-audit.json`. Publisher
links and license limitations are retained there and in each imported source.
