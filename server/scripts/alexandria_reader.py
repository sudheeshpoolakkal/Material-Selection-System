"""Bounded streaming reader for Alexandria's NaN-containing JSON archives.

Python's JSON decoder recognizes the publisher's NaN tokens without changing
chemical formula strings such as NaNbO3. Selectable values are checked separately.
"""
import bz2
import json
import math
from pathlib import Path
import re


def entries(path):
    decoder = json.JSONDecoder()
    with bz2.open(path, 'rt', encoding='utf-8') as source:
        buffer = source.read(262144)
        match = re.search(r'"entries"\s*:\s*\[', buffer)
        if not match:
            raise ValueError('Expected Alexandria entries array missing')
        position = match.end()
        while True:
            while position < len(buffer) and buffer[position] in ' \r\n\t,':
                position += 1
            if position < len(buffer) and buffer[position] == ']':
                return
            try:
                row, position = decoder.raw_decode(buffer, position)
            except json.JSONDecodeError:
                remainder = source.read(262144)
                if not remainder:
                    raise ValueError('Truncated Alexandria entries array')
                buffer = buffer[position:] + remainder
                position = 0
                if len(buffer) > 32 * 1024 * 1024:
                    raise ValueError('Alexandria entry exceeds 32 MiB safety bound')
                continue
            yield row
            if position > 262144:
                buffer = buffer[position:] + source.read(262144)
                position = 0


def finite(value, positive=False):
    try:
        n = float(value)
        return n if math.isfinite(n) and (not positive or n > 0) else None
    except (TypeError, ValueError):
        return None


def normalize_file(arguments):
    path, masses = arguments
    path = Path(path)
    directory = path.parent / 'normalized'
    directory.mkdir(exist_ok=True)
    target = directory / (path.stem + '.jsonl')
    id_path = directory / (path.stem + '.ids')
    count, coverage = 0, {}
    with target.open('w', encoding='utf-8') as output, id_path.open('w') as identifiers:
        for row in entries(path):
            data, props = row['data'], {}
            identifier, formula = data['mat_id'], data['formula']
            value = finite(data.get('e_form'))
            if value is not None:
                props['formationEnergy'] = value
            value = finite(data.get('band_gap_ind'))
            if value is not None and value >= 0:
                props['bandGap'] = value
            volume = finite(row['structure']['lattice'].get('volume'), positive=True)
            composition = row['composition']
            if volume and all(element in masses for element in composition):
                mass = sum(masses[element] * amount for element, amount in composition.items())
                density = finite(mass / (6.02214076e23 * volume * 1e-24), positive=True)
                if density is not None:
                    props['density'] = density
            material = {'externalId': identifier, 'name': f'{formula} · {identifier}'[:255], 'category': 'Crystalline', 'sourceUrl': 'https://alexandria.icams.rub.de/',
                        'description': 'Alexandria PBE relaxed crystal. Computed properties; original structure is retained in the source archive.',
                        'properties': props, 'metadata': {'formula': formula, 'accession': identifier, 'sourceFile': path.name, 'spaceGroup': finite(data.get('spg')),
                            'energyAboveHullEvPerAtom': finite(data.get('e_above_hull')), 'unitCellVolumeAngstrom3': volume,
                            'propertyBasis': {key: 'derived from DFT unit cell' if key == 'density' else 'computed' for key in props}}}
            output.write(json.dumps(material, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
            identifiers.write(identifier + '\n')
            count += 1
            for key in props:
                coverage[key] = coverage.get(key, 0) + 1
    return {'path': str(target), 'ids': str(id_path), 'count': count, 'coverage': coverage}
