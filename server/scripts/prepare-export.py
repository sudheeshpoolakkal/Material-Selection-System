#!/usr/bin/env python3
"""Prepare an authorized CSV export for the existing MySQL importer.

Column names vary with vendor export layouts. A mapping declares the actual
headers, units, evidence columns and licensing reference. This tool does not
connect to vendor accounts or claim that an unavailable database is integrated.
"""
import argparse
import csv
import hashlib
import io
import json
import math
import re
from pathlib import Path

STRENGTH = {'MPa': 1, 'GPa': 1000, 'Pa': 1e-6, 'kPa': .001, 'psi': .006894757293168, 'ksi': 6.894757293168}
MODULUS = {k: v / 1000 for k, v in STRENGTH.items()}
UNITS = {
    'density': {'g/cm3': 1, 'g/cm³': 1, 'kg/dm3': 1, 'kg/m3': .001, 'lb/in3': 27.6799047102},
    'tensileStrength': STRENGTH, 'yieldStrength': STRENGTH, 'youngModulus': MODULUS, 'bulkModulus': MODULUS, 'shearModulus': MODULUS,
    'thermalConductivity': {'W/mK': 1, 'W/m·K': 1, 'W/(m*K)': 1},
    'specificHeat': {'J/kgK': 1, 'J/kg·K': 1, 'kJ/kgK': 1000},
    'thermalExpansion': {'um/mK': 1, 'µm/m·K': 1, '1/K': 1e6},
    'electricalResistivity': {'uohm m': 1, 'µΩ·m': 1, 'ohm m': 1e6, 'ohm mm2/m': 1},
    'hardnessVickers': {'HV': 1}, 'elongation': {'%': 1}, 'elongationA80': {'%': 1},
    'testTemperature': {'C': 1, '°C': 1, 'K': 1, 'F': 1}, 'maxServiceTemp': {'C': 1, '°C': 1, 'K': 1, 'F': 1},
}
QUALITATIVE = {'cost': {'Low', 'Moderate', 'Medium', 'High', 'Very High'}, 'corrosionResistance': {'Poor', 'Fair', 'Moderate', 'Good', 'Excellent'}, 'magnetizable': {'Yes', 'No'}}
EMPTY = {'', '-', '–', '—', 'n/a', 'na', 'not reported', 'not available', 'unknown', 'null'}
QUANTITY = re.compile(r'([+-]?\d+(?:\.\d+)?)(?:\s*(?:–|to|-)\s*([+-]?\d+(?:\.\d+)?))?')

def quantity(raw, key, unit):
    raw = raw.strip()
    if raw.lower() in EMPTY:
        return None, None
    if key in QUALITATIVE:
        if raw not in QUALITATIVE[key]:
            raise ValueError(f'Invalid {key}: {raw}')
        return raw, None
    if key not in UNITS or unit not in UNITS[key]:
        raise ValueError(f'Unsupported unit {unit!r} for {key}; declare an explicit unit conversion.')
    match = QUANTITY.fullmatch(raw)
    if not match:
        raise ValueError(f'Invalid quantity {raw!r} for {key}; annotations or ambiguous values need review.')
    values = [float(x) for x in match.groups() if x is not None]
    values = [((v - 32) * 5 / 9 if unit == 'F' else v - 273.15 if unit == 'K' else v) if key in ('testTemperature', 'maxServiceTemp') else v * UNITS[key][unit] for v in values]
    if any(not math.isfinite(v) for v in values) or (len(values) == 2 and values[0] > values[1]):
        raise ValueError('Non-finite or reversed range')
    if key in ('testTemperature', 'maxServiceTemp'):
        if any(v < -273.15 for v in values):
            raise ValueError('Temperature below absolute zero')
    elif any(v < 0 or (key not in ('elongation', 'elongationA80', 'thermalExpansion') and v == 0) for v in values):
        raise ValueError(f'Invalid physical value for {key}')
    values = [round(v, 8) for v in values]
    if len(values) == 1:
        return values[0], None
    # Upper density avoids understating mass; other available numeric screening
    # fields use the lower limit. Retain the interval for display and auditing.
    chosen = values[1] if key == 'density' else values[0]
    return chosen, {'min': values[0], 'max': values[1], 'screeningValue': 'upper bound' if key == 'density' else 'lower bound'}

def normalize(data, mapping):
    source = mapping.get('source', {})
    if not source.get('license') or not source.get('rightsReference'):
        raise ValueError('Declare the applicable license and rightsReference for this export. Public availability is not a reuse grant.')
    if not source.get('key') or not source.get('name') or not str(source.get('url', '')).startswith('https://'):
        raise ValueError('Source key, name and HTTPS URL are required')
    columns = mapping['columns']
    if not all(columns.get(k) for k in ('externalId', 'name')):
        raise ValueError('Map a stable condition-specific externalId and material name')
    reader = csv.DictReader(io.StringIO(data.decode('utf-8-sig')), delimiter=mapping.get('delimiter', ','))
    required = list(columns.values()) + [p['column'] for p in mapping['properties'].values()] + [p['basisColumn'] for p in mapping['properties'].values() if p.get('basisColumn')] + list(mapping.get('metadataColumns', {}).values())
    missing = set(required) - set(reader.fieldnames or [])
    if missing:
        raise ValueError(f'Mapped columns missing from export: {sorted(missing)}')
    materials, ids = [], set()
    for line, row in enumerate(reader, 2):
        if not any((v or '').strip() for v in row.values()):
            continue
        try:
            external_id, name = row[columns['externalId']].strip(), row[columns['name']].strip()
            if not external_id or external_id in ids or not name:
                raise ValueError('Missing or duplicate stable ID/name; distinct forms/tests need separate IDs')
            ids.add(external_id)
            p, basis, bounds = {}, {}, {}
            for key, config in mapping['properties'].items():
                if key not in UNITS and key not in QUALITATIVE:
                    raise ValueError(f'Unknown property {key}')
                if not config.get('basis') and not config.get('basisColumn'):
                    raise ValueError(f'Declare evidence basis for {key}; measured and estimated values must remain distinguishable')
                result, interval = quantity(row[config['column']], key, config.get('unit', ''))
                if result is None:
                    continue
                p[key] = result
                basis[key] = row[config['basisColumn']].strip() if config.get('basisColumn') else config['basis']
                if not basis[key]:
                    raise ValueError(f'Missing evidence basis for {key}')
                if interval:
                    bounds[key] = interval
            metadata = {key: row[column].strip() for key, column in mapping.get('metadataColumns', {}).items() if row[column].strip()}
            # Preserve native exporter labels/conditions and per-property evidence.
            metadata.update({'propertyBasis': basis, 'propertyBounds': bounds, 'sourceRow': line, 'rightsReference': source['rightsReference'], 'screeningNote': 'Ranges use the upper bound for density and lower bound for other numeric screening fields. Preserve the source conditions and evidence basis when comparing records.'})
            category = row[columns['category']].strip() if columns.get('category') else mapping.get('category')
            source_url = row[columns['sourceUrl']].strip() if columns.get('sourceUrl') else source['url']
            if not category or not source_url.startswith('https://') or not p:
                raise ValueError('Record needs category, HTTPS citation and at least one reported property')
            materials.append({'externalId': external_id, 'name': name, 'category': category, 'sourceUrl': source_url, 'description': row[columns['description']].strip() if columns.get('description') else f'Reference export from {source["name"]}; see source for material conditions.', 'properties': p, 'metadata': metadata})
        except (ValueError, AttributeError) as error:
            raise ValueError(f'CSV row {line}: {error}') from error
    if not materials:
        raise ValueError('Export contains no usable records')
    return {'source': {**source, 'kind': source.get('kind', 'literature-extracted'), 'checksum': hashlib.sha256(data).hexdigest()}, 'materials': materials}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--mapping', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    bundle = normalize(args.input.read_bytes(), json.loads(args.mapping.read_text()))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(bundle["materials"])} validated records written to {args.output}; no database changes made.')

if __name__ == '__main__':
    main()
