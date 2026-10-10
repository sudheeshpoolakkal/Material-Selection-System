import copy
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).parents[1]

def module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / file)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result

manufacturer = module('manufacturer', 'prepare-manufacturers.py')
exports = module('exports', 'prepare-export.py')

class ManufacturerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundles = {key: manufacturer.prepare(key, offline=True) for key in manufacturer.SOURCES}

    def test_published_tables_preserve_grades_forms_and_ranges(self):
        records = [m for b in self.bundles.values() for m in b['materials']]
        self.assertEqual(len(records), 81)
        self.assertEqual(len({m['metadata']['grade'] for m in records}), 29)
        required = {'density', 'tensileStrength', 'yieldStrength', 'youngModulus', 'thermalConductivity'}
        self.assertTrue(all(required <= set(m['properties']) for m in records))
        for bundle in self.bundles.values():
            self.assertEqual(len({m['externalId'] for m in bundle['materials']}), len(bundle['materials']))
            self.assertEqual(bundle['source']['kind'], 'literature-extracted')
        core = {m['externalId']: m for m in self.bundles['core']['materials']}
        cold, hot = core['core-304-4301-c'], core['core-304-4301-h']
        self.assertEqual(cold['properties']['tensileStrength'], 540)
        self.assertEqual(cold['metadata']['propertyBounds']['tensileStrength']['max'], 750)
        self.assertEqual(hot['properties']['tensileStrength'], 520)
        self.assertEqual(cold['properties']['density'], 7.9)
        self.assertEqual(cold['properties']['youngModulus'], 200)
        self.assertEqual(cold['properties']['thermalConductivity'], 15)
        self.assertEqual(cold['properties']['specificHeat'], 500)
        self.assertEqual(cold['metadata']['propertyCitations']['thermalConductivity']['page'], 10)

    def test_missing_and_typical_values_are_not_relabelled_as_measurements(self):
        core = {m['externalId']: m for m in self.bundles['core']['materials']}
        self.assertNotIn('specificHeat', core['core-201-4372-c']['properties'])
        for bundle in self.bundles.values():
            for m in bundle['materials']:
                self.assertTrue({'cost', 'corrosionResistance', 'maxServiceTemp'}.isdisjoint(m['properties']))
        forta = {m['externalId']: m for m in self.bundles['forta']['materials']}
        wire = forta['forta-ldx-2101-w']
        self.assertEqual(wire['properties']['tensileStrength'], 700)
        self.assertEqual(wire['metadata']['propertyBasis']['tensileStrength'], 'typical')
        self.assertNotIn('tensileStrength', wire['metadata']['propertyBounds'])
        self.assertNotIn('testTemperature', wire['properties'])
        self.assertEqual(wire['properties']['youngModulus'], 205)

class ExportTests(unittest.TestCase):
    def setUp(self):
        self.mapping = {'source': {'key': 'test-export', 'name': 'Test export', 'url': 'https://example.test/data', 'license': 'test fixture only', 'rightsReference': 'Synthetic fixture'}, 'category': 'Metal', 'columns': {'externalId': 'ID', 'name': 'Name'}, 'properties': {'density': {'column': 'Density', 'unit': 'kg/m3', 'basis': 'reference'}, 'tensileStrength': {'column': 'Strength', 'unit': 'ksi', 'basis': 'specified minimum'}}}

    def test_csv_units_bounds_missing_values_and_native_ids(self):
        data = b'ID,Name,Density,Strength\r\nA-c,Alloy cold,7700-7900,80-100\r\nA-h,Alloy hot,7800,N/A\r\n'
        bundle = exports.normalize(data, self.mapping)
        cold, hot = bundle['materials']
        self.assertEqual(cold['properties']['density'], 7.9)
        self.assertEqual(cold['metadata']['propertyBounds']['density']['min'], 7.7)
        self.assertAlmostEqual(cold['properties']['tensileStrength'], 551.58058345)
        self.assertEqual(cold['metadata']['propertyBounds']['tensileStrength']['screeningValue'], 'lower bound')
        self.assertNotIn('tensileStrength', hot['properties'])
        self.assertEqual(hot['externalId'], 'A-h')
        self.assertEqual(len(bundle['source']['checksum']), 64)

    def test_invalid_exports_fail_without_partial_output(self):
        for data in [b'ID,Name,Density,Strength\nX,One,7800,100-80\n', b'ID,Name,Density,Strength\nX,One,7800,nan\n', b'ID,Name,Density,Strength\nX,One,7800,100\nX,Two,7800,100\n']:
            with self.assertRaises(ValueError):
                exports.normalize(data, self.mapping)
        mapping = copy.deepcopy(self.mapping)
        mapping['source']['license'] = ''
        with self.assertRaises(ValueError):
            exports.normalize(b'ID,Name,Density,Strength\nX,One,7800,100\n', mapping)
        with self.assertRaises(ValueError):
            exports.quantity('120', 'density', 'unknown')
        self.assertEqual(exports.quantity('32', 'testTemperature', 'F')[0], 0)
        self.assertEqual(exports.quantity('293.15', 'testTemperature', 'K')[0], 20)

if __name__ == '__main__':
    unittest.main()
