#!/usr/bin/env python3
"""Download a complete MaterialRegistry API snapshot and prepare a source bundle.

Cached snapshots are reusable offline. --refresh fetches a new complete snapshot.
No keys are required. curl retries transient failures/429 respecting Retry-After;
requests are spaced below the documented 100 requests/minute IP limit.
"""
import argparse
import collections
import datetime
import hashlib
import json
import math
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data/downloads/material-registry'
MANIFEST = ROOT / 'data/material-registry-manifest.json'
API = 'https://api.materialregistry.com/api/v1/materials'
DOCS = 'https://www.materialregistry.com/docs/api'
FAMILIES = {**dict.fromkeys(['stainless-steel', 'carbon-steel', 'aluminum', 'copper', 'titanium', 'nickel-alloy', 'tool-steel', 'cast-iron', 'magnesium', 'zinc'], 'Metal'), 'plastic': 'Polymer', 'composite': 'Composite', 'ceramic': 'Ceramic', 'rubber': 'Elastomer', 'other': 'Other'}
# Gauge length, hardness scale and unspecified elastic modulus must not be guessed.
PROPERTIES = {
    'density': ('density', {'kg/m³': .001, 'g/cm³': 1}),
    'tensile_strength': ('tensileStrength', {'MPa': 1}),
    'yield_strength': ('yieldStrength', {'MPa': 1}),
    'elastic_modulus': ('elasticModulus', {'GPa': 1, 'MPa': .001}),
    'elongation': ('elongationUnspecified', {'%': 1}),
    'thermal_conductivity': ('thermalConductivity', {'W/m·K': 1, 'W/(m·K)': 1}),
    'melting_point': ('meltingPoint', {'°C': 1}),
    'electrical_conductivity': ('electricalConductivityIACS', {'% IACS': 1}),
}
HARDNESS = {'HB': 'hardnessBrinell', 'HRC': 'hardnessRockwellC', 'HRB': 'hardnessRockwellB', 'HV': 'hardnessVickers', 'Rockwell R': 'hardnessRockwellR', 'Rockwell M': 'hardnessRockwellM', 'Shore A': 'hardnessShoreA', 'Shore 00': 'hardnessShore00'}
NOTE = 'Registry reference values. The snapshot supplies no underlying property citations or test conditions; values are not identified as measured, typical or specified minima. Grade designations are registry cross-references, not a certification of interchangeability. Melting point is not a service-temperature rating. Elongation gauge length and elastic-modulus method are unspecified.'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def snapshot(folder, expected_hashes=None):
    records, pages, expected_total, ids = [], [], None, set()
    offset = 0
    while expected_total is None or offset < expected_total:
        filename = f'page-{offset}.json'
        raw = (folder / filename).read_bytes()
        if expected_hashes is not None and expected_hashes.get(filename) != digest(raw):
            raise ValueError(f'{filename}: checksum mismatch; use --refresh for a new snapshot')
        response = json.loads(raw)
        if response.get('success') is not True:
            raise ValueError(f'{filename}: unsuccessful API response')
        data = response['data']
        total = data['total']
        if type(total) is not int or not 0 < total <= 100000 or data['offset'] != offset or data['limit'] != 100:
            raise ValueError('Unexpected pagination schema or catalog size')
        if expected_total is None:
            expected_total = total
        if total != expected_total or len(data['materials']) != min(100, total - offset):
            raise ValueError('Incomplete or changing catalog; no partial import was prepared')
        for material in data['materials']:
            if not material.get('id') or material['id'] in ids:
                raise ValueError('Missing/duplicate stable registry ID')
            ids.add(material['id'])
            records.append(material)
        pages.append({'file': filename, 'sha256': digest(raw), 'url': f'{API}?limit=100&offset={offset}'})
        offset += 100
    return records, pages

def normalize(records, checksum, snapshot_date):
    materials = []
    for record in records:
        if not record.get('slug') or not record.get('name') or record['category'] not in FAMILIES:
            raise ValueError('Missing identity or new category requiring review')
        url = API + '/' + record['slug']
        values, basis, conditions, unmapped = {}, {}, {}, []
        for original in record.get('properties') or []:
            kind, unit, value = original['propertyType'], original['unit'], original['value']
            if type(value) not in (int, float) or not math.isfinite(value):
                raise ValueError(f'{record["slug"]}: invalid numeric property')
            if kind == 'hardness':
                if unit not in HARDNESS:
                    raise ValueError(f'Unreviewed hardness scale: {unit}')
                key, factor = HARDNESS[unit], 1
            elif kind in PROPERTIES:
                key, units = PROPERTIES[kind]
                if unit not in units:
                    raise ValueError(f'Unreviewed unit: {kind} / {unit}')
                factor = units[unit]
            else:
                unmapped.append({**original, 'reason': 'Undefined or unsupported property type; excluded from screening'})
                continue
            if key in values:
                raise ValueError(f'{record["slug"]}: multiple {key} values need condition-specific review')
            if (key == 'meltingPoint' and value < -273.15) or (key != 'meltingPoint' and value < 0) or (key in ('density', 'tensileStrength', 'yieldStrength', 'elasticModulus', 'thermalConductivity') and value == 0):
                raise ValueError(f'{record["slug"]}: invalid physical value')
            values[key] = round(value * factor, 8)
            basis[key] = 'registry reference; basis unspecified'
            conditions[key] = 'Test conditions and underlying citation not supplied by registry'
            if key == 'elongationUnspecified':
                conditions[key] += '; gauge length unspecified'
            if key == 'elasticModulus':
                conditions[key] += '; modulus method unspecified'
        standards = [{'standard': s['standard'].upper(), 'code': s['code']} for s in record.get('standards') or []]
        aliases = sorted(set((record.get('searchTerms') or []) + [s['code'] for s in standards] + [s.get('normalizedCode', '') for s in record.get('standards') or []]) - {''})
        materials.append({'externalId': record['id'], 'name': record['name'], 'description': record.get('description', ''), 'category': FAMILIES[record['category']], 'sourceUrl': url, 'properties': values,
            'metadata': {'registrySlug': record['slug'], 'registryCategory': record['category'], 'isoGroup': record.get('isoGroup'), 'tags': record.get('tags', []), 'standards': standards, 'searchAliases': aliases, 'originalProperties': record.get('properties', []), 'unmappedProperties': unmapped, 'propertyBasis': basis, 'propertyConditions': conditions, 'screeningNote': NOTE, 'updatedAt': record.get('updatedAt'), 'rightsReference': 'Project owner authorization confirmation, 2026-10-10'}})
    return {'source': {'key': 'material-registry', 'name': 'MaterialRegistry engineering references', 'url': DOCS, 'kind': 'literature-extracted', 'version': f'Public API snapshot {snapshot_date}', 'checksum': checksum, 'license': 'Publisher describes open data; project use authorized by owner confirmation 2026-10-10', 'note': NOTE}, 'materials': materials}

def download(folder):
    offset, total = 0, None
    while total is None or offset < total:
        if offset:
            time.sleep(.8)
        target = folder / f'page-{offset}.json'
        subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '45', '--retry', '3', '--retry-delay', '2', '--retry-max-time', '60', f'{API}?limit=100&offset={offset}', '-o', str(target)], check=True)
        data = json.loads(target.read_text())
        if data.get('success') is not True or type(data.get('data', {}).get('total')) is not int:
            raise ValueError('Invalid API pagination response')
        total = data['data']['total']
        if not 0 < total <= 100000:
            raise ValueError('Unexpected catalog size')
        offset += 100

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--offline', action='store_true')
    mode.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else None
    refresh = args.refresh or (not args.offline and not (CACHE / 'page-0.json').exists())
    # A failed fetch or validation leaves the last complete snapshot untouched.
    with tempfile.TemporaryDirectory(prefix='snapshot-', dir=CACHE) as temp:
        folder = Path(temp) if refresh else CACHE
        if refresh:
            download(folder)
        records, pages = snapshot(folder, {p['file']: p['sha256'] for p in previous['pages']} if previous and not refresh else None)
        raw_checksum = digest(''.join(p['sha256'] for p in pages).encode())
        date = datetime.datetime.now(datetime.timezone.utc).date().isoformat() if refresh or not previous else previous['snapshotDate']
        bundle = normalize(records, raw_checksum, date)
        output = json.dumps(bundle, ensure_ascii=False, indent=2) + '\n'
        if refresh:
            for page in pages:
                shutil.copyfile(folder / page['file'], CACHE / page['file'])
        (CACHE / 'catalog.json').write_text(output)
        coverage = collections.Counter(key for m in bundle['materials'] for key in m['properties'])
        manifest = {'snapshotDate': date, 'source': bundle['source'], 'records': len(records), 'pages': pages, 'checksumDefinition': 'SHA-256 of ordered concatenated page SHA-256 hex digests', 'normalizedSha256': digest(output.encode()), 'coverage': dict(sorted(coverage.items())), 'registryCategories': dict(collections.Counter(m['category'] for m in records)), 'missingUnderlyingCitations': sum(not p.get('source') for m in records for p in m['properties']), 'unmappedPropertyCount': sum(len(m['metadata']['unmappedProperties']) for m in bundle['materials']), 'termsStatus': 'Terms link returned 404; GitHub link leads to github.com home; no specific open-data license identified. Project use authorized by owner confirmation.'}
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        print(f'{len(records)} MaterialRegistry records prepared; density {coverage["density"]}, tensile {coverage["tensileStrength"]}, thermal conductivity {coverage["thermalConductivity"]}.')

if __name__ == '__main__':
    main()
