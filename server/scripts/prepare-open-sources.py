#!/usr/bin/env python3
"""Normalize acquired public datasets; keep observations and property methods separate."""
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data/downloads/open-sources'


def number(value, positive=False):
    try:
        n = float(value)
        return n if math.isfinite(n) and (not positive or n > 0) else None
    except (TypeError, ValueError):
        return None


def outgassing(data):
    document = json.loads(data)
    columns = [c['fieldName'] for c in document['meta']['view']['columns']]
    if document['meta']['view']['licenseId'] != 'PUBLIC_DOMAIN':
        raise ValueError('NASA snapshot license changed; review before importing')
    materials, identifiers = [], set()
    for values in document['data']:
        if len(values) != len(columns):
            raise ValueError('Outgassing row has unexpected columns')
        row = dict(zip(columns, values))
        identifier = row[':sid']
        if identifier in identifiers:
            raise ValueError('Duplicate NASA row accession')
        identifiers.add(identifier)
        props = {}
        for field, key in [('tml', 'totalMassLoss'), ('cvcm', 'collectedVolatileCondensableMaterial'), ('wvr', 'waterVaporRegained')]:
            n = number(row[field])
            if n is not None:
                if not 0 <= n <= 100:
                    raise ValueError(f'Outgassing percentage out of range: {identifier}')
                props[key] = n
        url = 'https://etd.gsfc.nasa.gov/capabilities/outgassing-database/'
        materials.append({
            'externalId': identifier, 'name': row['sample_material'][:255], 'category': 'Spacecraft materials',
            'sourceUrl': url, 'properties': props,
            'description': f"NASA vacuum outgassing test {row['id']}; usage: {row['material_usage'] or 'unspecified'}. Cure: {row['cure'] or 'not specified in export'}.",
            'metadata': {'sampleId': row['id'], 'manufacturerCode': row['mfr'], 'nativeCategory': row['category'], 'spaceCode': row['space_code'],
                         'processing': row['cure'], 'testType': 'ASTM E595 vacuum outgassing', 'usage': row['material_usage'],
                         'searchAliases': [s for s in [row['id'], row['mfr'], row['material_usage'], row['sample_material']] if s],
                         'propertyBasis': {k: 'experimental' for k in props},
                         'propertyConditions': {k: 'ASTM E595 vacuum test; retain sample-specific cure and processing' for k in props},
                         'screeningNote': 'A test observation for this sample and cure. Passing chosen TML/CVCM limits is not an approval or qualification for flight.'},
        })
    return {'source': {
        'key': 'nasa-outgassing', 'name': 'NASA Goddard vacuum outgassing tests', 'url': 'https://data.nasa.gov/docs/legacy/Outgassing_Db/Outgassing_Db_rows.json',
        'license': 'Public domain (NASA snapshot metadata)', 'kind': 'experimental', 'version': 'Legacy Socrata snapshot; rows dated 2015',
        'checksum': hashlib.sha256(data).hexdigest(),
        'note': 'NASA-published ASTM E595 vacuum outgassing observations. TML, CVCM and WVR are mass percentages, not mechanical properties. Duplicate sample IDs remain separate using original row accessions. Cure, usage and manufacturer codes are retained. The legacy snapshot is not a claim of live/current qualification.'}, 'materials': materials}


def write_bundle(name, bundle):
    CACHE.mkdir(parents=True, exist_ok=True)
    target = CACHE / (name + '.json')
    target.write_text(json.dumps(bundle, ensure_ascii=False), encoding='utf-8')
    manifest_path = ROOT / 'data/open-sources-manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'sources': []}
    entry = {**bundle['source'], 'records': len(bundle['materials']), 'normalizedSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
             'coverage': {k: sum(k in m['properties'] for m in bundle['materials']) for k in sorted({k for m in bundle['materials'] for k in m['properties']})}}
    manifest['sources'] = [s for s in manifest['sources'] if s['key'] != entry['key']] + [entry]
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f'{target}: {entry["records"]:,} source records', flush=True)


def aflow(directory):
    mapping = [('density', 'density'), ('ael_bulk_modulus_voigt', 'bulkModulus'), ('ael_shear_modulus_voigt', 'shearModulus'),
               ('ael_bulk_modulus_vrh', 'bulkModulusVRH'), ('ael_shear_modulus_vrh', 'shearModulusVRH'),
               ('ael_youngs_modulus_vrh', 'youngModulus'), ('agl_thermal_conductivity_300K', 'thermalConductivity'),
               ('Egap', 'bandGap'), ('enthalpy_formation_atom', 'formationEnergy')]
    rows, contents = {}, []
    for name in ['elastic', 'thermal']:
        raw = (directory / (name + '.json')).read_bytes()
        contents.append(raw)
        page = json.loads(raw)
        total = int(next(iter(page)).split(' of ')[1])
        if len(page) != total:
            raise ValueError('AFLOW acquisition is incomplete')
        for r in page.values():
            if r['auid'] in rows and rows[r['auid']] != r:
                # Different queries request the same fields; disagreement must not be blended.
                raise ValueError(f'AFLOW observation changed during download: {r["auid"]}')
            rows[r['auid']] = r
    materials = []
    for identifier, row in rows.items():
        properties, conditions = {}, {}
        for native, key in mapping:
            value = number(row.get(native), positive=key not in ['bandGap', 'formationEnergy'])
            if value is not None and (key != 'bandGap' or value >= 0):
                properties[key] = value
                conditions[key] = 'AGL model at 300 K' if key == 'thermalConductivity' else 'Voigt–Reuss–Hill average' if key == 'youngModulus' or key.endswith('VRH') else 'DFT; ' + native
        materials.append({'externalId': identifier, 'name': f'{row["compound"]} · {identifier}', 'category': 'Crystalline',
                          'description': 'AFLOW computed crystal with AEL elastic and/or AGL thermal properties. Crystal calculations do not establish commercial-grade strength or service ratings.',
                          'sourceUrl': 'https://aflow.org/material/?id=' + identifier,
                          'properties': properties, 'metadata': {'formula': row['compound'], 'accession': identifier, 'aurl': row.get('aurl'),
                           'spaceGroup': row.get('spacegroup_relax'), 'propertyBasis': {k: 'computed' for k in properties}, 'propertyConditions': conditions}})
    return {'source': {'key': 'aflow-ael-agl', 'name': 'AFLOW elastic and thermal calculations', 'url': 'https://aflow.org/API/aflux/',
        'license': 'AFLOW: scientific, academic and non-commercial use only', 'kind': 'computed', 'version': 'AFLUX snapshot 2026-10-10',
        'checksum': hashlib.sha256(b''.join(contents)).hexdigest(),
        'note': 'Complete union of accessible AEL Voigt bulk modulus and AGL 300 K conductivity queries. Duplicate AUIDs are one record. Calculated elastic properties are not tensile strengths. Conductivity is the AGL model at 300 K; Voigt and VRH moduli remain separate. AFLOW source terms restrict use to scientific, academic and non-commercial purposes. Cite AFLOW/AEL/AGL papers linked by the source schema.'}, 'materials': materials}


def digest_files(paths):
    digest = hashlib.sha256()
    for path in paths:
        with path.open('rb') as handle:
            while block := handle.read(1024 * 1024):
                digest.update(block)
    return digest.hexdigest()


def materials_project(directory):
    import pyarrow.parquet as pq
    files = [directory / 'summary.parquet', directory / 'elasticity.parquet']
    sources = [json.loads((directory / (name + '-source.json')).read_text()) for name in ['summary', 'elasticity']]
    if sources[0]['version'] != sources[1]['version']:
        raise ValueError('MP summary and elasticity versions differ')
    checksum = digest_files(files)
    elastic = {}
    for batch in pq.ParquetFile(files[1]).iter_batches(batch_size=1000, columns=['material_id', 'deprecated', 'formula_pretty', 'bulk_modulus', 'shear_modulus', 'homogeneous_poisson', 'origins', 'warnings']):
        for row in batch.to_pylist():
            if not row['deprecated']:
                if row['material_id'] in elastic:
                    raise ValueError('Duplicate MP elasticity record')
                elastic[row['material_id']] = row
    columns = ['material_id', 'deprecated', 'builder_meta', 'formula_pretty', 'density', 'band_gap', 'formation_energy_per_atom', 'energy_above_hull', 'is_stable', 'symmetry', 'origins', 'warnings']
    common = {'url': 'https://doi.org/10.1063/1.4812323', 'kind': 'computed', 'version': sources[0]['version'].replace('version=', ''), 'checksum': checksum,
              'note': 'Materials Project public S3 summary and elasticity snapshot. Density, band gap, formation energy and moduli are calculated crystal properties, not measured commercial grades. Deprecated records are retained in the original snapshot but excluded from screening. Voigt and Voigt–Reuss–Hill moduli remain separate; property origins and source version are retained. Data normalized from original Parquet files. Cite Jain et al., APL Materials 1, 011002 (2013).'}
    source_defs = {'BY-C': {**common, 'key': 'materials-project-core', 'name': 'Materials Project core crystal properties', 'license': 'CC BY 4.0'},
                   'BY-NC': {**common, 'key': 'materials-project-gnome', 'name': 'Materials Project GNoME crystal properties', 'license': 'CC BY-NC 4.0 (GNoME); non-commercial use only', 'note': common['note'] + ' GNoME-originated structures carry the separate non-commercial license.'}}
    paths, handles, counts, coverage = {}, {}, {k: 0 for k in source_defs}, {k: {} for k in source_defs}
    # Stage body records on disk so normalizing the full collection has bounded memory.
    try:
        for license_key, source in source_defs.items():
            paths[license_key] = CACHE / (source['key'] + '.body')
            handles[license_key] = paths[license_key].open('w', encoding='utf-8')
        seen = set()
        skipped_deprecated = 0
        for batch in pq.ParquetFile(files[0]).iter_batches(batch_size=1000, columns=columns):
            for row in batch.to_pylist():
                if row['deprecated']:
                    skipped_deprecated += 1
                    continue
                identifier = row['material_id']
                if identifier in seen:
                    raise ValueError('Duplicate MP summary identifier')
                seen.add(identifier)
                license_key = row['builder_meta']['license']
                if license_key not in source_defs:
                    raise ValueError('Unknown MP per-record license')
                props, conditions, citations = {}, {}, {}
                for native, key in [('density', 'density'), ('band_gap', 'bandGap'), ('formation_energy_per_atom', 'formationEnergy')]:
                    value = number(row[native], positive=key == 'density')
                    if value is not None and (key != 'bandGap' or value >= 0):
                        props[key] = value
                        citations[key] = {'url': sources[0]['url'], 'label': 'MP summary snapshot'}
                e = elastic.get(identifier)
                if e:
                    if e['formula_pretty'] != row['formula_pretty']:
                        raise ValueError('MP elasticity formula differs from summary')
                    for field, key, method in [('bulk_modulus', 'bulkModulus', 'voigt'), ('shear_modulus', 'shearModulus', 'voigt'), ('bulk_modulus', 'bulkModulusVRH', 'vrh'), ('shear_modulus', 'shearModulusVRH', 'vrh')]:
                        value = number((e[field] or {}).get(method), positive=True)
                        if value is not None:
                            props[key] = value
                            conditions[key] = 'DFT elastic tensor; ' + ('Voigt' if method == 'voigt' else 'Voigt–Reuss–Hill')
                            citations[key] = {'url': sources[1]['url'], 'label': 'MP elasticity snapshot'}
                    value = number(e['homogeneous_poisson'])
                    if value is not None:
                        props['poissonRatio'] = value
                metadata = {'formula': row['formula_pretty'], 'accession': identifier, 'licenseCode': license_key, 'batchId': row['builder_meta']['batch_id'],
                            'symmetry': row['symmetry'], 'energyAboveHullEvPerAtom': row['energy_above_hull'], 'isStable': row['is_stable'],
                            'propertyBasis': {k: 'computed' for k in props}, 'propertyConditions': conditions, 'propertyCitations': citations,
                            'origins': row['origins'], 'warnings': row['warnings'], 'elasticityOrigins': e['origins'] if e else []}
                material = {'externalId': identifier, 'name': f'{row["formula_pretty"]} · {identifier}', 'category': 'Crystalline',
                            'description': 'Computed crystalline material from Materials Project. Original calculation accessions, methods and licensing are retained.',
                            'sourceUrl': 'https://materialsproject.org/materials/' + identifier, 'properties': props, 'metadata': metadata}
                handles[license_key].write(json.dumps(material, ensure_ascii=False, default=str) + '\n')
                counts[license_key] += 1
                for key in props:
                    coverage[license_key][key] = coverage[license_key].get(key, 0) + 1
    finally:
        for handle in handles.values():
            handle.close()
    manifest_path = ROOT / 'data/open-sources-manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'sources': []}
    import shutil
    for license_key, source in source_defs.items():
        target = CACHE / (source['key'] + '.jsonl')
        with target.open('wb') as output:
            output.write((json.dumps({'source': source, 'records': counts[license_key]}) + '\n').encode())
            with paths[license_key].open('rb') as body:
                shutil.copyfileobj(body, output)
        paths[license_key].unlink()
        entry = {**source, 'records': counts[license_key], 'coverage': coverage[license_key], 'normalizedSha256': digest_files([target]), 'files': sources, 'excludedDeprecatedRecords': skipped_deprecated}
        manifest['sources'] = [s for s in manifest['sources'] if s['key'] != source['key']] + [entry]
        print(f'{target}: {counts[license_key]:,} records', flush=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')


def tpsx(directory):
    from bs4 import BeautifulSoup
    listing = json.loads((directory / 'index.json').read_bytes())
    materials, errors = [], []
    mapping = {
        'Density': ('density', 'kg/m^3', .001, 0),
        'Thermal Conductivity (Isotropic)': ('thermalConductivity', 'W/m-K', 1, 0),
        'Thermal Conductivity (In-Plane)': ('thermalConductivityInPlane', 'W/m-K', 1, 0),
        'Thermal Conductivity (Thru-the-Thickness)': ('thermalConductivityThroughThickness', 'W/m-K', 1, 0),
        'Specific Heat': ('specificHeat', 'J/kg-K', 1, 0),
        'Tensile Strength (Isotropic)': ('tensileStrength', 'Pa', .000001, 0),
        'Tensile Yield Strength (Isotropic)': ('yieldStrength', 'Pa', .000001, 0),
        'Tensile Modulus (Isotropic)': ('youngModulus', 'Pa', .000000001, 0),
        'Poisson\'s Ratio (Isotropic)': ('poissonRatio', '-', 1, 0),
        'Coefficient of Thermal Expansion (Isotropic)': ('thermalExpansionCoefficient', '1/K', 1000000, 0),
        'Emissivity': ('emissivity', '-', 1, 0),
        'Melt Temperature': ('meltingPoint', 'K', 1, -273.15),
        'Multiple Use Temperature Limit': ('reusableTemperatureLimit', 'K', 1, -273.15),
        'Single Use Temperature Limit': ('singleUseTemperatureLimit', 'K', 1, -273.15),
    }
    files = [directory / 'index.json']
    for name, database, category, identifier in listing['aaData']:
        path = directory / f'{identifier}.html'
        if not path.exists():
            errors.append({'id': identifier, 'error': 'Missing detail page'})
            continue
        files.append(path)
        soup = BeautifulSoup(path.read_bytes(), 'html.parser')
        table = soup.find('table', id='materials-property-data-table')
        if not table:
            errors.append({'id': identifier, 'error': 'No published property table'})
            continue
        properties, basis, conditions, citations, native = {}, {}, {}, {}, []
        for row in table.select('tbody tr'):
            cells = row.find_all('td', recursive=False)
            if len(cells) < 8:
                continue
            for footnote in cells[0].find_all('sup'):
                footnote.decompose()
            values = [c.get_text(' ', strip=True) for c in cells]
            property_name, value, unit, uncertainty, source, stp, reference, modified = values[:8]
            anchor = cells[-1].find('a', href=True)
            url = 'https://tpsx.arc.nasa.gov' + anchor['href'] if anchor and anchor['href'].startswith('/') else None
            native.append({'name':property_name,'value':value,'unit':unit,'uncertainty':uncertainty,'basis':source,'stp':stp,'reference':reference,'modified':modified,'url':url})
            rule = mapping.get(property_name)
            n = number(value)
            if not rule or n is None:
                continue
            key, expected_unit, scale, offset = rule
            if unit != expected_unit:
                raise ValueError(f'TPSX unit changed: {property_name} {unit}')
            # Keep multiple observations visible in native metadata, never silently choose a conflicting row.
            normalized = n * scale + offset
            if key in properties and properties[key] != normalized:
                raise ValueError(f'Multiple conflicting standard-condition values: {identifier} {key}')
            properties[key] = normalized
            basis[key] = source or 'unspecified in source'
            conditions[key] = f'Source standard conditions; STP: {stp}; source uncertainty: {uncertainty or "unspecified"} {unit}; modified {modified}'
            citations[key] = {'url': url or f'https://tpsx.arc.nasa.gov/Material?id={identifier}', 'label': f'TPSX reference {reference}; temperature data'}
        notes = soup.get_text(' ', strip=True)
        start, end = notes.find('Notes:'), notes.find('Property References:')
        reference_start = notes.find('Property References:')
        reference_end = notes.find('General References:')
        references = notes[reference_start:reference_end] if 0 <= reference_start < reference_end else ''
        url = f'https://tpsx.arc.nasa.gov/Material?id={identifier}'
        description = f'TPSX reference entry from {database}; source category: {category}. Original property conditions and directional measurements are retained.'
        materials.append({'externalId':f'TPSX-{identifier}','name':name[:255],'category':'Thermal protection','description':description,'sourceUrl':url,'properties':properties,
            'metadata':{'nativeCategory':category,'database':database,'searchAliases':[name,category,database], 'nativeProperties':native,'propertyBasis':basis,'propertyConditions':conditions,'propertyCitations':citations,
                        'references':references,'sourceNotes':notes[start:end] if 0 <= start < end else '',
                        'screeningNote':'Directional values remain separate. Single-use and reusable temperature limits are original source entries, not an assumed general service rating. Consult the temperature data and original references for operating conditions.'}})
    if errors:
        report = {'listedRecords': int(listing['iTotalRecords']), 'propertyRecords': len(materials), 'unavailableDetails': errors}
        (ROOT / 'data/tpsx-unavailable-records.json').write_text(json.dumps(report, indent=2) + '\n')
        print(f'TPSX: {len(errors)} detail pages unavailable; recorded explicitly, excluded from screening', flush=True)
    return {'source':{'key':'nasa-tpsx','name':'NASA TPSX thermal protection materials','url':'https://tpsx.arc.nasa.gov/','license':'NASA TPSX reference data; underlying contributor rights retained','kind':'literature-extracted','version':'Public SI standard-condition snapshot 2026-10-10','checksum':digest_files(files),
        'note':'NASA TPSX public material reference tables, including NASA and contributing databases. Standard-condition values retain source basis, uncertainty and STP annotations; original property pages link temperature curves and references. Isotropic and directional quantities remain separate. Unsupported source fields remain visible in original-property details. No blanket open-data license is claimed for industry-contributed data.'},'materials':materials}


def nomad(data):
    document = json.loads(data)
    if len(document['data']) != document['total']:
        raise ValueError('NOMAD query incomplete')
    materials = []
    for row in document['data']:
        if row.get('license') != 'CC BY 4.0' or not row.get('published') or row.get('with_embargo'):
            raise ValueError('Unexpected NOMAD publication or licensing state')
        results = row['results']
        if not results.get('method', {}).get('simulation'):
            raise ValueError('NOMAD observation is not a simulation; classify its evidence separately')
        mechanical = results.get('properties', {}).get('mechanical', {})
        properties, conditions = {}, {}
        for field, voigt, hill in [('bulk_modulus','bulkModulus','bulkModulusVRH'), ('shear_modulus','shearModulus','shearModulusVRH')]:
            for observation in mechanical.get(field, []):
                key = {'voigt_average': voigt, 'voigt_reuss_hill_average': hill}.get(observation['type'])
                value = number(observation['value'], positive=True)
                if key and value is not None:
                    if key in properties:
                        raise ValueError('Multiple NOMAD results for one elastic averaging method')
                    properties[key] = value / 1000000000  # NOMAD archive SI Pa -> GPa
                    conditions[key] = observation['type'] + '; consult the original calculation and dataset for pressure and temperature'
        material = results.get('material', {})
        formula = material.get('chemical_formula_reduced') or material.get('chemical_formula_descriptive') or 'Unspecified formula'
        identifier = row['entry_id']
        datasets = row.get('datasets', [])
        materials.append({'externalId':identifier,'name':f'{formula} · NOMAD {identifier}','category':'Crystalline','sourceUrl':'https://nomad-lab.eu/prod/v1/gui/entry/id/'+identifier,
            'description':'NOMAD published elastic calculation. ' + '; '.join(d['dataset_name'] for d in datasets),
            'properties':properties,'metadata':{'formula':formula,'accession':identifier,'materialId':material.get('material_id'), 'uploadId':row['upload_id'],'datasets':datasets,
                'simulation':results['method']['simulation'],'mechanicalResultsSI':mechanical,'references':row.get('references',[]), 'propertyBasis':{k:'computed' for k in properties},'propertyConditions':conditions,
                'nativeProperties':[{'name':f'{field}: {observation["type"]}','value':observation['value'],'unit':'Pa','basis':'computed','stp':'not specified in indexed metadata','url':'https://nomad-lab.eu/prod/v1/gui/entry/id/'+identifier} for field in ['bulk_modulus','shear_modulus'] for observation in mechanical.get(field,[])],
                'searchAliases':[formula]+[d['dataset_name'] for d in datasets],
                'screeningNote':'Distinct entries can be different pressures or calculation conditions for the same composition. Keep original entry and dataset accessions when comparing.'}})
    return {'source':{'key':'nomad-elastic','name':'NOMAD published elastic calculations','url':'https://nomad-lab.eu/prod/v1/api/v1/entries/query','license':'CC BY 4.0 (verified per published entry)','kind':'computed','version':'Public bulk/shear modulus query 2026-10-10','checksum':hashlib.sha256(data).hexdigest(),
        'note':'Complete public query for records tagged with bulk_modulus or shear_modulus. Original SI pressure units are converted to GPa; Voigt and VRH values remain separate. Source entries are calculation observations, not distinct commercial grades. Per-entry publication state, license, datasets and calculation methods were checked and retained. This is the mechanical-property subset, not the full multi-million-entry NOMAD archive.'},'materials':materials}


def alexandria(directory):
    import bz2
    import ijson
    from pymatgen.core import Element
    manifest_path = ROOT / 'data/alexandria-acquisition-manifest.json'
    acquisition = json.loads(manifest_path.read_text())
    files = [directory / f['file'] for f in acquisition['files']]
    for path, entry in zip(files, acquisition['files']):
        if digest_files([path]) != entry['sha256']:
            raise ValueError('Alexandria archive checksum changed')
    source = {'key':'alexandria-pbe','name':'Alexandria PBE crystal calculations','url':'https://alexandria.icams.rub.de/datasets.html',
              'license':'CC BY 4.0','kind':'computed','version':'PBE 3D 2025.07.02 published archive set',
              'checksum':hashlib.sha256(''.join(f['sha256'] for f in acquisition['files']).encode()).hexdigest(),
              'note':'Complete published PBE three-dimensional archive set. These are computed crystal structures, not commercial material grades. Formation energy and indirect band gap are source DFT results. Density is derived from the relaxed unit-cell composition and volume using pymatgen atomic masses and the exact Avogadro constant; it is not a supplier measurement. Source structures remain in the downloaded archives. Cite the Alexandria database and retain its accessions and CC BY 4.0 attribution.'}
    target = CACHE / 'alexandria-pbe.jsonl'
    counts, coverage = 0, {}
    masses = {str(e):float(e.atomic_mass) for e in Element}
    # CPU workers process bounded individual entries; downloaded archives are unchanged.
    import concurrent.futures
    import shutil
    import sqlite3
    from alexandria_reader import normalize_file
    results = {}
    with concurrent.futures.ProcessPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(normalize_file, (str(path), masses)): path for path in files}
        for future in concurrent.futures.as_completed(futures):
            result=future.result()
            results[str(futures[future])]=result
            print(f'Alexandria normalized {len(results)}/{len(files)} archives',flush=True)
    ids_path=directory/'normalization-ids.sqlite'
    if ids_path.exists(): ids_path.unlink()
    identifiers=sqlite3.connect(ids_path)
    identifiers.execute('CREATE TABLE ids (accession TEXT PRIMARY KEY)')
    counts=sum(result['count'] for result in results.values())
    try:
        with target.with_suffix('.partial').open('wb') as output:
            output.write((json.dumps({'source':source,'records':counts})+'\n').encode())
            for path in files:
                result=results[str(path)]
                with open(result['path'],'rb') as normalized: shutil.copyfileobj(normalized,output)
                batch=[]
                with open(result['ids']) as accession_file:
                    for line in accession_file:
                        batch.append((line.strip(),))
                        if len(batch)==5000:
                            identifiers.executemany('INSERT INTO ids VALUES (?)',batch);batch=[]
                    if batch: identifiers.executemany('INSERT INTO ids VALUES (?)',batch)
                identifiers.commit()
                for key,value in result['coverage'].items():coverage[key]=coverage.get(key,0)+value
        target.with_suffix('.partial').replace(target)
    finally:
        identifiers.close()
    ids_path.unlink()
    # Remove intermediate normalization parts once the complete stream is assembled.
    for result in results.values():
        Path(result['path']).unlink()
        Path(result['ids']).unlink()
    manifest_path = ROOT / 'data/open-sources-manifest.json'
    manifest = json.loads(manifest_path.read_text())
    entry = {**source,'records':counts,'coverage':coverage,'normalizedSha256':digest_files([target]),'archiveFiles':len(files)}
    manifest['sources'] = [s for s in manifest['sources'] if s['key'] != source['key']] + [entry]
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'{target}: {counts:,} records',flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', choices=['outgassing', 'aflow', 'materials-project', 'tpsx', 'nomad', 'alexandria'])
    parser.add_argument('--input', type=Path)
    args = parser.parse_args()
    if args.source == 'outgassing':
        write_bundle('nasa-outgassing', outgassing((args.input or ROOT / 'data/downloads/source-audit/nasa-outgassing.json').read_bytes()))
    elif args.source == 'aflow':
        write_bundle('aflow-ael-agl', aflow(args.input or CACHE / 'aflow'))
    elif args.source == 'materials-project':
        materials_project(args.input or CACHE / 'materials-project')
    elif args.source == 'tpsx':
        write_bundle('nasa-tpsx', tpsx(args.input or CACHE / 'tpsx'))
    elif args.source == 'nomad':
        write_bundle('nomad-elastic', nomad((args.input or CACHE / 'nomad/raw.json').read_bytes()))
    else:
        alexandria(args.input or CACHE / 'alexandria')
