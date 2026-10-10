#!/usr/bin/env python3
"""Normalize verified manufacturer tables for the authorized project.

PDFs stay in the ignored download cache. The project owner confirmed team
authorization on 2026-10-10; copyright and applicable agreement terms remain.
Product forms are separate records; tensile ranges retain both limits. Screening
uses their lower limit, never an invented midpoint. No costs/service limits or
generic corrosion scores are inferred from descriptions.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data/downloads/manufacturers'
SOURCES = {
    'core': {'url': 'https://www.outokumpu.com/-/media/files/products/core/outokumpu-core-range-datasheet.pdf', 'sha256': '91d2f4b1340562b0d692a3921a5b0ea2518ddcb6cbdcc9ec97a3d7ad886d7ad9', 'mechanicalPage': 8, 'physicalPage': 10, 'physicalTable': 7, 'grades': 14, 'records': 31},
    'supra': {'url': 'https://www.outokumpu.com/-/media/files/products/supra/outokumpu-supra-range-datasheet.pdf', 'sha256': '39e9860f49003d5731eb005d30bb49c368dd9a02abc4609f1cdf1dcf14777f4a', 'mechanicalPage': 6, 'physicalPage': 8, 'physicalTable': 7, 'grades': 8, 'records': 22},
    'forta': {'url': 'https://www.outokumpu.com/en/industries/-/media/files/products/forta/outokumpu-forta-range-datasheet.pdf', 'sha256': '3283f08f406a50b4bb833fa56a22134881a6df254b55f66ad40b3d895e51774d', 'mechanicalPage': 9, 'physicalPage': 12, 'physicalTable': 9, 'grades': 7, 'records': 28},
}
FORMS = {'C': 'Cold rolled coil and sheet', 'H': 'Hot rolled coil and sheet', 'P': 'Quarto plate', 'W': 'Wire rod', 'B': 'Bar'}
PHYSICAL = ['density', 'youngModulus', 'thermalExpansion', 'thermalConductivity', 'specificHeat', 'electricalResistivity', 'magnetizable']
NUM = r'(?:\d+(?:\.\d+)?|[–—-])'
RANGE = r'\d+(?:\.\d+)?(?:\s*[–-]\s*\d+(?:\.\d+)?)?'

def value(token):
    return None if token in ('–', '—', '-') else float(token)

def physical_rows(page, key):
    rows = {}
    # Never read the converted imperial table or temperature-dependent tables.
    metric = page.split('Imperial values')[0]
    for line in metric.splitlines():
        match = re.match(r'\s*(' + key.title() + r'\s+.+?)\s+(\d\.\d)\s+(\d+)\s+(' + NUM + r')\s+(\d+)\s+(' + NUM + r')\s+([\d.]+)(?:\s+(Yes|No))?\s*$', line)
        if not match:
            continue
        name = match[1].strip().rstrip('*')
        if key == 'forta':
            name = re.split(r'\s{2,}', name)[0]
        values = [value(x) for x in match.groups()[1:7]]
        p = {k: v for k, v in zip(PHYSICAL, values) if v is not None}
        if match[8]:
            p['magnetizable'] = match[8]
        rows[name] = p
    if len(rows) != SOURCES[key]['grades']:
        raise ValueError(f'{key}: expected {SOURCES[key]["grades"]} physical rows, found {len(rows)}')
    return rows

def bundle_from_text(text, key):
    config = SOURCES[key]
    pages = text.split('\f')
    physical = physical_rows(pages[config['physicalPage'] - 1], key)
    mechanical = pages[config['mechanicalPage'] - 1]
    if key == 'forta':
        form_pattern = r'(Cold rolled coil \(C\)(?:\s+2\))?|Hot rolled coil \(H\)(?:\s+2\))?|Quarto plate \(P\)|Wire rod 1\)|Bar)'
        row_pattern = form_pattern + r'\s+(\d+)\s+(' + RANGE + r')\s+(' + NUM + r')\s+(' + NUM + r')\s*$'
    else:
        row_pattern = r'(C\*{0,2}|H\*?|P)\s+(\d+)\s+(' + NUM + r')\s+(' + RANGE + r')\s+(' + NUM + r')\s+(' + NUM + r')\s*$'
    materials = []
    current = None
    for line in mechanical.splitlines():
        stripped = line.strip()
        grade = next((name for name in sorted(physical, key=len, reverse=True) if stripped.startswith(name + ' ')), None)
        if grade:
            current = grade
        match = re.search(row_pattern, line)
        if not match:
            continue
        if current is None:
            raise ValueError('A mechanical row has no grade')
        token = match[1]
        if key == 'forta':
            form = 'C' if token.startswith('Cold') else 'H' if token.startswith('Hot') else 'P' if token.startswith('Quarto') else 'W' if token.startswith('Wire') else 'B'
            yield_value, tensile, elongation, elongation80 = match.groups()[1:5]
            standard = 'Outokumpu typical' if form == 'W' else 'Outokumpu MDS-D35' if '2)' in token else 'EN 10088-2 / EN 10088-3'
        else:
            form = token[0]
            yield_value, _, tensile, elongation, elongation80 = match.groups()[1:6]
            standard = 'EN 10028-7' if '**' in token or (key == 'supra' and '*' in token) else 'ASTM A240' if '*' in token else 'EN 10088-2'
        limits = [float(x) for x in re.split(r'\s*[–-]\s*', tensile)]
        p = {**physical[current], 'yieldStrength': float(yield_value), 'tensileStrength': limits[0]}
        if key != 'forta':
            p['testTemperature'] = 20
        for name, raw in [('elongation', elongation), ('elongationA80', elongation80)]:
            if value(raw) is not None:
                p[name] = value(raw)
        basis = {k: 'reference' for k in physical[current]}
        mechanical_basis = 'typical' if form == 'W' else 'specified minimum'
        basis.update({k: mechanical_basis for k in ['yieldStrength', 'tensileStrength', 'elongation', 'elongationA80'] if k in p})
        if 'testTemperature' in p:
            basis['testTemperature'] = 'source condition'
        bounds = {} if form == 'W' else {'tensileStrength': {'min': limits[0], **({'max': limits[1]} if len(limits) == 2 else {}), 'screeningValue': 'lower bound'}}
        citations = {k: {'page': config['physicalPage'], 'table': config['physicalTable'], 'url': config['url'] + '#page=' + str(config['physicalPage'])} for k in physical[current]}
        citations.update({k: {'page': config['mechanicalPage'], 'table': 5, 'url': config['url'] + '#page=' + str(config['mechanicalPage'])} for k in p if k not in physical[current]})
        slug = re.sub(r'[^a-z0-9]+', '-', current.lower()).strip('-')
        materials.append({
            'externalId': f'{slug}-{form.lower()}', 'name': f'{current} · {FORMS[form]}', 'category': 'Metal',
            'sourceUrl': config['url'] + '#page=' + str(config['mechanicalPage']), 'properties': p,
            'description': f'Stainless steel supplier grade; {FORMS[form].lower()}. Mechanical properties: {standard}. Separate values for each product form; physical properties are grade reference data.',
            'metadata': {'supplier': 'Outokumpu', 'grade': current, 'productForm': FORMS[form], 'standard': standard, 'testType': 'T', 'testTemperatureC': p.get('testTemperature'), 'propertyBasis': basis, 'propertyBounds': bounds, 'propertyCitations': citations, 'propertyConditions': {'thermalExpansion': '20–100 °C', 'youngModulus': '20 °C', 'thermalConductivity': '20 °C', 'specificHeat': '20 °C', 'electricalResistivity': '20 °C', 'elongation': 'A5: initial gauge length 5.65√S₀', 'elongationA80': 'Initial gauge length 80 mm'}, 'screeningNote': 'Tensile screening and ranking use the published lower bound where a range or minimum is specified; otherwise the reported typical value is used. Physical values are grade-level reference data, not measurements on the mechanical-test specimen.'},
        })
    if len(materials) != config['records'] or len({m['externalId'] for m in materials}) != len(materials):
        raise ValueError(f'{key}: unexpected/duplicate mechanical rows ({len(materials)})')
    return {'source': {
        'key': f'outokumpu-{key}', 'name': f'Outokumpu {key.title()} stainless steels', 'url': config['url'],
        'kind': 'literature-extracted', 'version': 'Published supplier datasheet; SHA-256 pinned 2026-10-10',
        'license': 'Copyright Outokumpu; project use authorized by owner confirmation 2026-10-10', 'checksum': config['sha256'],
        'note': 'Supplier datasheet values, kept separate by grade and product form. Tensile screening uses the lower published limit; full ranges, standards, source pages and property conditions are retained. Costs, generic corrosion ratings and service-temperature limits are not inferred. Project owner confirmed team authorization on 2026-10-10. Publisher copyright and applicable agreements remain in force.',
    }, 'materials': materials}

def prepare(key, offline=False):
    config = SOURCES[key]
    pdf = CACHE / (key + '.pdf')
    if not pdf.exists():
        if offline:
            raise ValueError(f'Missing {pdf}')
        with urlopen(config['url'], timeout=45) as response:
            data = response.read(25 * 1024 * 1024 + 1)
        if len(data) > 25 * 1024 * 1024 or not data.startswith(b'%PDF-'):
            raise ValueError('Expected a PDF below 25 MB')
        pdf.write_bytes(data)
    if hashlib.sha256(pdf.read_bytes()).hexdigest() != config['sha256']:
        raise ValueError('Source changed; review tables and explicitly update the pinned version.')
    text = subprocess.check_output(['pdftotext', '-layout', str(pdf), '-']).decode('utf-8')
    return bundle_from_text(text, key)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    manifest = {'purpose': 'use in this project under owner-confirmed team authorization, 2026-10-10', 'authorizationRecord': 'server/data/source-authorizations.json', 'termsUrl': 'https://www.outokumpu.com/en/legal-notice', 'sources': []}
    for key in SOURCES:
        bundle = prepare(key, args.offline)
        output = CACHE / (key + '.json')
        output.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n')
        manifest['sources'].append({**bundle['source'], 'records': len(bundle['materials']), 'grades': SOURCES[key]['grades'], 'normalizedSha256': hashlib.sha256(output.read_bytes()).hexdigest()})
        print(f'{key}: {len(bundle["materials"])} grade/product-form records')
    (ROOT / 'data/manufacturer-sources-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
