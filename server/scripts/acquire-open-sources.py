#!/usr/bin/env python3
"""Acquire public source snapshots, with resumable caches and bounded requests.

This downloads source files, not inferred properties. Normalization is separate.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import time
import urllib.request
import re
import shutil
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data/downloads/open-sources'


def download(url, path, attempts=3):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size:
        return path.read_bytes()
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(url, timeout=45) as response:
                data = response.read()
            if not data:
                raise ValueError('Empty response')
            temp = path.with_suffix(path.suffix + '.partial')
            temp.write_bytes(data)
            temp.replace(path)
            return data
        except Exception:
            if attempt == attempts - 1:
                raise
            time.sleep(2 ** (attempt + 1))


def tpsx():
    directory = CACHE / 'tpsx'
    query = 'iDisplayStart=0&iDisplayLength=10000&sEcho=1&iColumns=4&iSortingCols=1&iSortCol_0=0&sSortDir_0=asc&sColumns=name,database,category,link&sSearch=&bRegex=false'
    query += ''.join(f'&mDataProp_{i}={i}&bSearchable_{i}=true&bSortable_{i}=true&sSearch_{i}=&bRegex_{i}=false' for i in range(4))
    url = 'https://tpsx.arc.nasa.gov/database/?' + query
    listing = json.loads(download(url, directory / 'index.json'))
    rows = listing['aaData']
    if len(rows) != int(listing['iTotalRecords']) or len({r[3] for r in rows}) != len(rows):
        raise ValueError('TPSX listing incomplete or contains duplicate accessions')
    errors = []
    def fetch(row):
        identifier = row[3]
        page = f'https://tpsx.arc.nasa.gov/Material?id={identifier}'
        try:
            data = download(page, directory / f'{identifier}.html')
            if b'materials-property-data-table' not in data:
                raise ValueError('Expected SI property table missing')
            time.sleep(.3)
            return {'id': identifier, 'url': page, 'sha256': hashlib.sha256(data).hexdigest()}
        except Exception as error:
            return {'id': identifier, 'error': str(error)}
    files = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        for i, result in enumerate(executor.map(fetch, rows), 1):
            (errors if 'error' in result else files).append(result)
            if i % 50 == 0 or i == len(rows):
                print(f'TPSX {i}/{len(rows)} pages; {len(errors)} failures', flush=True)
    manifest = {'source': 'NASA TPSX', 'indexUrl': url, 'indexSha256': hashlib.sha256((directory / 'index.json').read_bytes()).hexdigest(), 'listedRecords': len(rows), 'downloadedRecords': len(files), 'files': files, 'errors': errors}
    (ROOT / 'data/tpsx-acquisition-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if errors:
        raise ValueError(f'{len(errors)} pages unavailable; successful pages cached for retry')


def alexandria():
    base = 'https://alexandria.icams.rub.de/data/pbe/2025.07.02/'
    directory = CACHE / 'alexandria'
    index = download(base, directory / 'index.html').decode()
    files = [(name, int(size)) for name, size in re.findall(r'href="([^"]+\.bz2)"[^\n]*?\s(\d+)\s*\n', index)]
    if not files:
        raise ValueError('No published Alexandria archives found')
    remaining = sum(size for name, size in files if not (directory / name).exists())
    if shutil.disk_usage(directory).free < remaining + 8 * 1024 ** 3:
        raise ValueError('Insufficient disk space for all archives plus database headroom')
    def fetch(item):
        name, size = item
        data = download(base + name, directory / name)
        if len(data) != size:
            raise ValueError(f'Incomplete Alexandria archive: {name}')
        return {'file': name, 'url': base + name, 'bytes': size, 'sha256': hashlib.sha256(data).hexdigest()}
    acquired = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        for i, result in enumerate(executor.map(fetch, files), 1):
            acquired.append(result)
            print(f'Alexandria {i}/{len(files)} archives', flush=True)
    (ROOT / 'data/alexandria-acquisition-manifest.json').write_text(json.dumps({'source':base,'files':acquired,'bytes':sum(f['bytes'] for f in acquired)},indent=2)+'\n')


def nomad():
    path = CACHE / 'nomad/raw.json'
    if path.exists():
        return
    body = {'owner':'public','query':{'results.properties.available_properties:any':['bulk_modulus','shear_modulus']},'pagination':{'page_size':100}}
    rows, total = [], None
    while True:
        request = urllib.request.Request('https://nomad-lab.eu/prod/v1/api/v1/entries/query',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=45) as response:
            page = json.load(response)
        if total is not None and total != page['pagination']['total']:
            raise ValueError('NOMAD result count changed during acquisition')
        total = page['pagination']['total']
        rows.extend(page['data'])
        cursor = page['pagination'].get('next_page_after_value')
        if not cursor:
            break
        body['pagination']['page_after_value'] = cursor
        time.sleep(.5)
    if len(rows) != total or len({row['entry_id'] for row in rows}) != total:
        raise ValueError('NOMAD pagination is incomplete or contains duplicate entries')
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps({'query':body['query'],'total':total,'data':rows}))
    print(f'NOMAD acquired {total} public mechanical-property observations',flush=True)


def aflow():
    directory = CACHE / 'aflow'
    properties = 'ael_shear_modulus_voigt,ael_youngs_modulus_vrh,ael_bulk_modulus_vrh,ael_shear_modulus_vrh,Egap,enthalpy_formation_atom,density,compound,auid'
    queries = {'elastic':'ael_bulk_modulus_voigt(*),'+properties+',agl_thermal_conductivity_300K,paging(1,10000)',
               'thermal':'agl_thermal_conductivity_300K(*),'+properties+',ael_bulk_modulus_voigt,paging(1,10000)', 'schema':'schema'}
    for name, query in queries.items():
        raw=download('https://aflow.org/API/aflux/?'+query,directory/(name+'.json'))
        if name!='schema':
            page=json.loads(raw)
            if len(page)!=int(next(iter(page)).split(' of ')[1]):
                raise ValueError('AFLOW result exceeds current query page; implement pagination before importing')
        print(f'AFLOW {name}: {len(raw):,} bytes cached',flush=True)


def materials_project():
    directory = CACHE / 'materials-project'
    base = 'https://materialsproject-build.s3.amazonaws.com/'
    ns = {'s':'http://s3.amazonaws.com/doc/2006-03-01/'}
    for collection in ['summary','elasticity']:
        source_path = directory/(collection+'-source.json')
        if source_path.exists() and (directory/(collection+'.parquet')).exists():
            continue
        raw = download(base+'?list-type=2&prefix=collections%2F'+collection+'%2F',directory/(collection+'-index.xml'))
        root=ET.fromstring(raw)
        if root.findtext('s:IsTruncated',namespaces=ns)!='false':
            raise ValueError('MP object listing is paginated; refusing incomplete snapshot')
        keys=[c.findtext('s:Key',namespaces=ns) for c in root.findall('s:Contents',ns)]
        active={}
        for key in sorted(k for k in keys if '/_delta_log/' in k and k.endswith('.json')):
            log=download(base+key,directory/(collection+'-'+key.split('/')[-1]))
            for line in log.splitlines():
                action=json.loads(line)
                if 'add' in action:active[action['add']['path']]=action['add']
                if 'remove' in action:active.pop(action['remove']['path'],None)
        versions=sorted({path.split('/')[0] for path in active})
        if not versions:raise ValueError('MP Delta log has no active partitions')
        latest=versions[-1]
        current=[path for path in active if path.startswith(latest+'/')]
        if len(current)!=1:raise ValueError('MP current partition has multiple files; extend dataset adapter before importing')
        url=base+'collections/'+collection+'/'+current[0]
        data=download(url,directory/(collection+'.parquet'))
        if len(data)!=active[current[0]]['size']:raise ValueError('MP Parquet size differs from Delta log')
        source_path.write_text(json.dumps({'url':url,'version':latest}))
        print(f'MP {collection}: {len(data):,} bytes cached',flush=True)


def outgassing():
    url='https://data.nasa.gov/docs/legacy/Outgassing_Db/Outgassing_Db_rows.json'
    download(url,CACHE/'nasa-outgassing-raw.json')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', choices=['tpsx', 'alexandria', 'nomad', 'aflow', 'materials-project', 'outgassing'])
    arguments = parser.parse_args()
    if arguments.source == 'tpsx':
        tpsx()
    elif arguments.source == 'alexandria':
        alexandria()
    elif arguments.source == 'nomad':
        nomad()
    elif arguments.source == 'aflow':
        aflow()
    elif arguments.source == 'materials-project':
        materials_project()
    else:
        outgassing()
