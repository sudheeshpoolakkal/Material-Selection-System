const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Resolve materials.json path - use the known project location
// The project is at C:\material-selection-system\ (single C:)
const dataPath = 'C:\\\\material-selection-system\\\\materials.json';

console.log('dataPath:', dataPath);
console.log('existsSync:', fs.existsSync(dataPath));

app.use(express.json());

app.get('/api/materials', (req, res) => {
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to load materials' });
    res.json(JSON.parse(data));
  });
});

app.get('/api/materials/search', (req, res) => {
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to load materials' });

    const materials = JSON.parse(data).materials;
    let results = [...materials];

    const { minDensity, maxDensity, minTensileStrength, maxTensileStrength,
            minThermalConductivity, maxThermalConductivity, minCost, maxCost,
            corrosionResistance, category } = req.query;

    if (minDensity !== undefined || maxDensity !== undefined) {
      const minD = minDensity !== undefined ? parseFloat(minDensity) : -Infinity;
      const maxD = maxDensity !== undefined ? parseFloat(maxDensity) : Infinity;
      results = results.filter(m => {
        const d = m.properties.density;
        return d !== undefined && d >= minD && d <= maxD;
      });
    }

    if (minTensileStrength !== undefined || maxTensileStrength !== undefined) {
      const minTS = minTensileStrength !== undefined ? parseInt(minTensileStrength) : -Infinity;
      const maxTS = maxTensileStrength !== undefined ? parseInt(maxTensileStrength) : Infinity;
      results = results.filter(m => {
        const ts = m.properties.tensileStrength;
        return ts !== undefined && ts >= minTS && ts <= maxTS;
      });
    }

    if (minThermalConductivity !== undefined || maxThermalConductivity !== undefined) {
      const minTC = minThermalConductivity !== undefined ? parseFloat(minThermalConductivity) : -Infinity;
      const maxTC = maxThermalConductivity !== undefined ? parseFloat(maxThermalConductivity) : Infinity;
      results = results.filter(m => {
        const tc = m.properties.thermalConductivity;
        return tc !== undefined && typeof tc === 'number' && tc >= minTC && tc <= maxTC;
      });
    }

    if (minCost !== undefined || maxCost !== undefined) {
      results = results.filter(m => {
        const c = m.properties.cost;
        return c && c >= (minCost || '') && c <= (maxCost || '');
      });
    }

    if (corrosionResistance) {
      results = results.filter(m => m.properties.corrosionResistance === corrosionResistance);
    }

    if (category) {
      results = results.filter(m => m.category === category);
    }

    res.json({ materials: results });
  });
});

app.get('/api/materials/category/:category', (req, res) => {
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to load materials' });
    const materials = JSON.parse(data).materials;
    const categoryMaterials = materials.filter(m => m.category === req.params.category);
    res.json({ materials: categoryMaterials });
  });
});

app.get('/api/materials/:id', (req, res) => {
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to load materials' });
    const material = JSON.parse(data).materials.find(m => m.id === parseInt(req.params.id));
    if (!material) return res.status(404).json({ error: 'Material not found' });
    res.json(material);
  });
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Material Selection System API running on http://localhost:${PORT}`);
});