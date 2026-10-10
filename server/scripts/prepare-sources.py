#!/usr/bin/env python3
"""Download pinned, published source files and normalize them for MySQL import.
No material property values are synthesized; display labels retain source accessions. Standard library only.
"""
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = ROOT / 'data' / 'downloads'
REVISION = '57afc55f94c8a6f4562f73a3173968cd4b2f83b1'
BASE = f'https://raw.githubusercontent.com/usnistgov/jarvis_leaderboard/{REVISION}/jarvis_leaderboard/benchmarks/AI/SinglePropertyPrediction/'
FILES = {
    'nist-bulk.zip': (BASE + 'dft_3d_bulk_modulus_kv.json.zip', '5535abd36e95770708fb59404174a0de1b6ff9245ac5714dcffcc1ff57fb7239'),
    'nist-shear.zip': (BASE + 'dft_3d_shear_modulus_gv.json.zip', '9fffd5990b7d695636194dcfd55b154782e58c7befdcb5713ec1248b4e510d5a'),
    'mpea.csv': ('https://raw.githubusercontent.com/CitrineInformatics/MPEA_dataset/master/MPEA_dataset.csv', 'c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d'),
}

def number(value, positive=False):
    try:
        value = float(value)
        if math.isfinite(value) and (not positive or value > 0):
            return value
    except (ValueError, TypeError):
        pass
    return None

def read_file(name, offline):
    path = DOWNLOADS / name
    url, checksum = FILES[name]
    if not path.exists():
        if offline:
            raise ValueError(f'Missing {path}')
        print(f'Downloading {name} from {url}', flush=True)
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read(20 * 1024 * 1024 + 1)
        if len(data) > 20 * 1024 * 1024:
            raise ValueError('Source file exceeds size limit')
        path.write_bytes(data)
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != checksum:
        raise ValueError(f'Checksum mismatch for {name}; inspect and explicitly update the source version before importing.')
    return data

def benchmark(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        content = json.loads(archive.read(archive.namelist()[0]))
    records = {}
    for split, values in content.items():
        for identifier, value in values.items():
            if identifier in records and records[identifier][0] != value:
                raise ValueError(f'Conflicting benchmark record {identifier}')
            records[identifier] = (value, split)
    return records

def nist_bundle(bulk_data, shear_data):
    bulk, shear = benchmark(bulk_data), benchmark(shear_data)
    materials = []
    for jid in sorted(set(bulk) | set(shear), key=lambda s: int(s.split('-')[1])):
        props = {}
        for key, records in [('bulkModulus', bulk), ('shearModulus', shear)]:
            value = number(records.get(jid, [None])[0], positive=True)
            if value is not None:
                props[key] = value
        if not props:
            continue
        materials.append({
            'externalId': jid, 'name': f'NIST crystal {jid}', 'category': 'Crystalline',
            'description': 'JARVIS-DFT crystalline material. Computed elastic moduli from NIST; identified by its original JARVIS accession. Chemical formula and commercial grade are not included in this benchmark export.',
            'sourceUrl': f'https://jarvis.nist.gov/jarvisdft/{jid}', 'properties': props,
            'metadata': {'method': 'Density functional theory, OptB88vdW; Voigt elastic moduli', 'propertyBasis': {k: 'computed' for k in props}, 'accession': jid},
        })
    return {'source': {
        'key': 'nist-jarvis-elastic', 'name': 'NIST JARVIS-DFT elastic benchmarks',
        'url': 'https://pages.nist.gov/jarvis_leaderboard/AI/SinglePropertyPrediction/dft_3d_bulk_modulus_kv/',
        'license': 'CC BY 4.0', 'kind': 'computed', 'version': REVISION,
        'checksum': hashlib.sha256(bulk_data + shear_data).hexdigest(),
        'note': 'NIST-published DFT calculations, not measured supplier-grade properties. Bulk and shear modulus are stiffness measures, not tensile strength. Missing density, prices, conductivity, applications and service limits are left unknown. Non-positive elastic moduli are excluded from selectable properties. Source: Choudhary et al., npj Computational Materials 6, 173 (2020), doi:10.1038/s41524-020-00440-1.',
    }, 'materials': materials}

def mpea_bundle(data):
    materials = []
    for i, row in enumerate(csv.DictReader(io.StringIO(data.decode('utf-8-sig'))), 1):
        formula = row['FORMULA'].strip()
        doi = row['REFERENCE: doi'].strip()
        if not formula or not doi:
            continue
        p = {}
        basis = {}
        fields = [
            ('density', 'PROPERTY: Exp. Density (g/cm$^3$)', 'PROPERTY: Calculated Density (g/cm$^3$)'),
            ('youngModulus', 'PROPERTY: Exp. Young modulus (GPa)', 'PROPERTY: Calculated Young modulus (GPa)'),
        ]
        for key, measured, computed in fields:
            value = number(row.get(measured), positive=True)
            b = 'experimental'
            if value is None:
                value = number(row.get(computed), positive=True)
                b = 'computed'
            if value is not None:
                p[key], basis[key] = value, b
        for key, field in [('yieldStrength','PROPERTY: YS (MPa)'), ('hardnessVickers','PROPERTY: HV')]:
            value = number(row.get(field), positive=True)
            if value is not None:
                p[key], basis[key] = value, 'experimental'
        # In this source UTS means maximum compression strength for C tests.
        # Only tensile (T) tests may supply the application's tensile-strength field.
        test_type = row['PROPERTY: Type of test'].strip()
        if test_type == 'T':
            value = number(row.get('PROPERTY: UTS (MPa)'), positive=True)
            if value is not None:
                p['tensileStrength'], basis['tensileStrength'] = value, 'experimental'
        temperature = number(next((v for k, v in row.items() if k.startswith('PROPERTY: Test temperature')), None))
        if temperature is not None:
            p['testTemperature'], basis['testTemperature'] = temperature, 'experimental'
        processing = row['PROPERTY: Processing method'].strip()
        metadata = {'formula': formula, 'processing': processing, 'microstructure': row['PROPERTY: Microstructure'], 'testType': test_type, 'testTemperatureC': temperature, 'doi': doi, 'paperTitle': row['REFERENCE: title'], 'year': row['REFERENCE: year'], 'sourceRow': i, 'propertyBasis': basis}
        materials.append({
            'externalId': f'MPEA-row-{i}', 'name': f'{formula} · {processing or "unspecified condition"} · record {i}',
            'category': 'Metal', 'sourceUrl': 'https://doi.org/' + doi, 'properties': p, 'metadata': metadata,
            'description': f'Published experimental alloy record; {processing or "processing unspecified"}, {"tensile" if test_type == "T" else "compression" if test_type == "C" else test_type or "unspecified"} test, {temperature if temperature is not None else "unspecified"} °C. Distinct test conditions and references are kept as separate records.',
        })
    return {'source': {
        'key': 'borg-mpea', 'name': 'Borg et al. experimental MPEA alloys',
        'url': 'https://doi.org/10.1038/s41597-020-00768-9', 'license': 'Apache-2.0 (source repository)',
        'kind': 'experimental', 'version': 'Published 2020; GitHub snapshot SHA-256 pinned', 'checksum': hashlib.sha256(data).hexdigest(),
        'note': 'Literature-curated experimental alloy test records from Borg et al., Scientific Data 7, 430 (2020). Records are material/condition observations, not distinct commercial grades. Calculated density and modulus are marked computed per property. Compression strengths are never imported as tensile strengths. Test temperature is not a service-temperature rating; processing history is not a compatibility certification.',
    }, 'materials': materials}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--offline', action='store_true', help='Normalize cached source files with checksum verification')
    args = parser.parse_args()
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    bundles = [('nist-elastic', nist_bundle(read_file('nist-bulk.zip', args.offline), read_file('nist-shear.zip', args.offline))), ('mpea', mpea_bundle(read_file('mpea.csv', args.offline)))]
    manifest = {'files': {name: {'url': url, 'sha256': checksum} for name, (url, checksum) in FILES.items()}, 'sources': []}
    for name, bundle in bundles:
        output = DOWNLOADS / (name + '.json')
        output.write_text(json.dumps(bundle, ensure_ascii=False), encoding='utf-8')
        manifest['sources'].append({**bundle['source'], 'records': len(bundle['materials']), 'normalizedSha256': hashlib.sha256(output.read_bytes()).hexdigest()})
        print(f'{output}: {len(bundle["materials"]):,} source records')
    (ROOT / 'data' / 'sources-manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
