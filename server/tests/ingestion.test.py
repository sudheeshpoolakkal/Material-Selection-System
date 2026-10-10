import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('prepare_sources', Path(__file__).parents[1] / 'scripts' / 'prepare-sources.py')
sources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sources)

class IngestionTests(unittest.TestCase):
    def test_compression_and_temperature_do_not_become_tensile_or_service_ratings(self):
        data = sources.mpea_bundle((sources.DOWNLOADS / 'mpea.csv').read_bytes())
        self.assertEqual(len(data['materials']), 1545)
        compression = [m for m in data['materials'] if m['metadata']['testType'] == 'C']
        self.assertTrue(compression)
        self.assertTrue(all('tensileStrength' not in m['properties'] for m in compression))
        self.assertTrue(all('maxServiceTemp' not in m['properties'] for m in data['materials']))
        self.assertGreater(sum('testTemperature' in m['properties'] for m in data['materials']), 1000)
        self.assertTrue(all('propertyBasis' in m['metadata'] for m in data['materials']))

    def test_nist_values_are_computed_stiffness_and_ids_are_unique(self):
        bundle = sources.nist_bundle((sources.DOWNLOADS / 'nist-bulk.zip').read_bytes(), (sources.DOWNLOADS / 'nist-shear.zip').read_bytes())
        self.assertEqual(len(bundle['materials']),19335)
        self.assertEqual(len({m['externalId'] for m in bundle['materials']}),19335)
        self.assertEqual(bundle['source']['kind'],'computed')
        self.assertTrue(all('tensileStrength' not in m['properties'] and 'density' not in m['properties'] for m in bundle['materials']))
        self.assertTrue(all(all(v>0 for v in m['properties'].values()) for m in bundle['materials']))
        silicon = next(m for m in bundle['materials'] if m['externalId']=='JVASP-1002')
        self.assertEqual(silicon['properties']['bulkModulus'],87.27)
        self.assertEqual(silicon['properties']['shearModulus'],63.28)

    def test_missing_and_invalid_numbers_are_not_zero(self):
        for value in ['',None,'na','nan','inf','-inf']:
            self.assertIsNone(sources.number(value))
        self.assertIsNone(sources.number(-1, positive=True))
        self.assertEqual(sources.number('-196'),-196)

if __name__ == '__main__':
    unittest.main()
