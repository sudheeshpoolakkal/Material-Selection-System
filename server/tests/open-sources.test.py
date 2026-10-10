import bz2
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location('open_sources', SCRIPTS / 'prepare-open-sources.py')
sources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sources)
from alexandria_reader import entries, normalize_file


class PublishedSources(unittest.TestCase):
    def test_nasa_snapshot_percentages_and_duplicate_sample_ids(self):
        path = SCRIPTS.parent / 'data/downloads/source-audit/nasa-outgassing.json'
        if not path.exists():
            self.skipTest('NASA source cache absent')
        bundle = sources.outgassing(path.read_bytes())
        self.assertEqual(len(bundle['materials']), 12859)
        self.assertEqual(len({m['externalId'] for m in bundle['materials']}), 12859)
        self.assertEqual(sum('totalMassLoss' in m['properties'] for m in bundle['materials']), 12858)
        self.assertEqual(sum('collectedVolatileCondensableMaterial' in m['properties'] for m in bundle['materials']), 12853)
        self.assertEqual(sum('waterVaporRegained' in m['properties'] for m in bundle['materials']), 10047)
        self.assertTrue(any(m['properties'].get('collectedVolatileCondensableMaterial') == 0 for m in bundle['materials']))
        self.assertNotIn('tensileStrength', bundle['materials'][0]['properties'])

    def test_aflow_complete_union_has_unique_accessions_and_distinct_methods(self):
        path = SCRIPTS.parent / 'data/downloads/open-sources/aflow'
        if not (path / 'elastic.json').exists():
            self.skipTest('AFLOW source cache absent')
        bundle = sources.aflow(path)
        self.assertEqual(len(bundle['materials']), 5664)
        first = bundle['materials'][0]
        self.assertAlmostEqual(first['properties']['density'], 2.62255)
        self.assertAlmostEqual(first['properties']['bulkModulus'], .666667)
        self.assertIn('300 K', first['metadata']['propertyConditions']['thermalConductivity'])
        self.assertNotIn('tensileStrength', first['properties'])

    def test_nan_tokens_do_not_corrupt_sodium_niobium_formula_and_missing_values(self):
        row = {'composition': {'Na': 1, 'Nb': 1, 'O': 3}, 'structure': {'lattice': {'volume': 100}},
               'data': {'mat_id': 'agm-test', 'formula': 'NaNbO3', 'e_form': float('nan'), 'band_gap_ind': 1.2, 'e_above_hull': float('nan'), 'stress': [[float('nan')]]}}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'sample.json.bz2'
            path.write_bytes(bz2.compress(json.dumps({'entries': [row]}).encode()))
            self.assertEqual(next(entries(path))['data']['formula'], 'NaNbO3')
            result = normalize_file((path, {'Na': 23, 'Nb': 93, 'O': 16}))
            material = json.loads(Path(result['path']).read_text())
            self.assertEqual(material['metadata']['formula'], 'NaNbO3')
            self.assertNotIn('formationEnergy', material['properties'])
            self.assertIsNone(material['metadata']['energyAboveHullEvPerAtom'])
            self.assertAlmostEqual(material['properties']['density'], 164 / (6.02214076e23 * 100e-24))
            self.assertEqual(material['properties']['bandGap'], 1.2)

    def test_nomad_moduli_convert_pa_to_gpa_and_preserve_calculation_conditions(self):
        path = SCRIPTS.parent / 'data/downloads/open-sources/nomad/raw.json'
        if not path.exists():
            self.skipTest('NOMAD source cache absent')
        bundle = sources.nomad(path.read_bytes())
        self.assertEqual(len(bundle['materials']), 120)
        first = bundle['materials'][0]
        self.assertAlmostEqual(first['properties']['bulkModulus'], 237.08)
        self.assertAlmostEqual(first['properties']['bulkModulusVRH'], 232.32)
        self.assertNotIn('tensileStrength', first['properties'])
        self.assertTrue(first['metadata']['datasets'])
        self.assertTrue(first['metadata']['nativeProperties'])

    def test_tpsx_units_directional_properties_and_explicit_missing_pages(self):
        path = SCRIPTS.parent / 'data/downloads/open-sources/tpsx'
        if not (path / '1547.html').exists():
            self.skipTest('TPSX cache absent')
        bundle = sources.tpsx(path)
        self.assertEqual(len(bundle['materials']),1545)
        sample=next(m for m in bundle['materials'] if m['externalId']=='TPSX-1547')
        self.assertAlmostEqual(sample['properties']['density'],.288)
        self.assertAlmostEqual(sample['properties']['thermalConductivityInPlane'],.199)
        self.assertAlmostEqual(sample['properties']['thermalConductivityThroughThickness'],.107)
        self.assertNotIn('thermalConductivity',sample['properties'])
        self.assertIn('assumed/assumed',sample['metadata']['propertyConditions']['density'])
        self.assertTrue(sample['metadata']['references'])
        self.assertTrue(any(m['properties'].get('singleUseTemperatureLimit') is not None for m in bundle['materials']))
        self.assertTrue(all('maxServiceTemp' not in m['properties'] for m in bundle['materials']))


if __name__ == '__main__':
    unittest.main()
