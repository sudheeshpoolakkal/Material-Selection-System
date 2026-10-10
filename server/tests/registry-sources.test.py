import collections
import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location('registry', ROOT / 'scripts/prepare-material-registry.py')
registry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(registry)

class RegistryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads(registry.MANIFEST.read_text())
        cls.raw, cls.pages = registry.snapshot(registry.CACHE, {p['file']: p['sha256'] for p in cls.manifest['pages']})
        cls.bundle = registry.normalize(cls.raw, cls.manifest['source']['checksum'], cls.manifest['snapshotDate'])
        cls.records = {m['metadata']['registrySlug']: m for m in cls.bundle['materials']}

    def test_complete_snapshot_and_coverage(self):
        self.assertEqual(len(self.raw), 702)
        self.assertEqual(len({m['externalId'] for m in self.bundle['materials']}), 702)
        counts = collections.Counter(k for m in self.bundle['materials'] for k in m['properties'])
        self.assertEqual(counts['density'], 702)
        self.assertEqual(counts['tensileStrength'], 599)
        self.assertEqual(counts['thermalConductivity'], 26)
        self.assertEqual(len({m['category'] for m in self.raw}), 14)
        self.assertEqual(sum(not p['source'] for m in self.raw for p in m['properties']), 2827)
        self.assertEqual(registry.digest(''.join(p['sha256'] for p in self.pages).encode()), self.manifest['source']['checksum'])

    def test_units_grade_codes_and_unspecified_gauges(self):
        steel = self.records['stainless-steel-304']
        self.assertEqual(steel['properties']['density'], 7.93)
        self.assertEqual(steel['properties']['tensileStrength'], 515)
        self.assertEqual(steel['properties']['hardnessBrinell'], 201)
        self.assertNotIn('hardnessVickers', steel['properties'])
        self.assertEqual(steel['properties']['elongationUnspecified'], 40)
        self.assertNotIn('elongation', steel['properties'])
        self.assertTrue({'1.4301', 'SUS304', 'S30400'} <= set(steel['metadata']['searchAliases']))
        for raw in self.raw:
            for p in raw['properties']:
                if p['propertyType'] == 'elastic_modulus' and p['unit'] == 'MPa':
                    self.assertEqual(self.records[raw['slug']]['properties']['elasticModulus'], round(p['value'] / 1000, 8))

    def test_thermal_and_hardness_semantics_are_preserved(self):
        plastic = self.records['abs-general-purpose']
        self.assertEqual(plastic['properties']['density'], 1.05)
        self.assertEqual(plastic['properties']['meltingPoint'], 230)
        self.assertEqual(plastic['properties']['hardnessRockwellR'], 110)
        self.assertNotIn('maxServiceTemp', plastic['properties'])
        self.assertNotIn('youngModulus', plastic['properties'])
        rubber = self.records['nbr-general-purpose']
        self.assertEqual(rubber['properties']['hardnessShoreA'], 70)
        self.assertEqual(self.records['alumina-96']['properties']['hardnessVickers'], 1500)
        self.assertEqual(self.records['aluminum-1050a']['properties']['thermalConductivity'], 231)
        self.assertTrue(all({'cost','corrosionResistance','testTemperature','maxServiceTemp'}.isdisjoint(m['properties']) for m in self.bundle['materials']))

    def test_malformed_property_is_retained_but_not_used(self):
        alloy = self.records['aluminum-a380']
        original = next(p for p in alloy['metadata']['originalProperties'] if p['propertyType']=='undefined')
        self.assertEqual(original['value'],159)
        self.assertEqual(len(alloy['metadata']['unmappedProperties']),1)
        self.assertNotIn('undefined',alloy['properties'])
        self.assertTrue(all('basis unspecified' in v for m in self.bundle['materials'] for v in m['metadata']['propertyBasis'].values()))

    def test_partial_duplicate_changed_and_invalid_snapshots_fail(self):
        first = json.loads((registry.CACHE / 'page-0.json').read_text())
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / 'page-0.json').write_text(json.dumps(first))
            with self.assertRaises(FileNotFoundError):
                registry.snapshot(folder)
            first['data']['materials'][1]['id'] = first['data']['materials'][0]['id']
            (folder / 'page-0.json').write_text(json.dumps(first))
            with self.assertRaisesRegex(ValueError,'duplicate'):
                registry.snapshot(folder)
        with self.assertRaisesRegex(ValueError,'checksum'):
            registry.snapshot(registry.CACHE, {'page-0.json':'0'*64})
        for change in [{'unit':'unknown'}, {'value':float('nan')}]:
            record = copy.deepcopy(self.raw[0])
            record['properties'][0].update(change)
            with self.assertRaises(ValueError):
                registry.normalize([record], '0'*64, 'test')

if __name__ == '__main__':
    unittest.main()
