const fs = require('fs');
const path = require('path');
let db = null;
try {
  db = require('../config/db');
} catch (e) {
  // DB is optional/fallback
}

// Primary data path inside the project with fallbacks
const primaryPath = path.join(__dirname, '..', 'data', 'materials.json');
const fallbackPath = 'C:\\material-selection-system\\materials.json';

const getMaterialsFilePath = () => {
  if (fs.existsSync(primaryPath)) return primaryPath;
  if (fs.existsSync(fallbackPath)) return fallbackPath;
  throw new Error('materials.json not found');
};

const getMaterialsData = () => {
  const filePath = getMaterialsFilePath();
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content).materials || [];
};

const saveMaterialsData = (materials) => {
  const filePath = getMaterialsFilePath();
  fs.writeFileSync(filePath, JSON.stringify({ materials }, null, 2), 'utf8');
};

// Cost ranking for semantic comparison
const COST_RANK = {
  'low': 1,
  'moderate': 2,
  'medium': 2,
  'high': 3,
  'very high': 4
};

// GET /api/materials
exports.getAllMaterials = (req, res) => {
  try {
    const materials = getMaterialsData();
    res.json({ materials, total: materials.length });
  } catch (error) {
    console.error('Error loading materials:', error);
    res.status(500).json({ error: 'Failed to load materials database' });
  }
};

// GET /api/materials/categories
exports.getCategories = (req, res) => {
  try {
    const materials = getMaterialsData();
    const categories = Array.from(new Set(materials.map(m => m.category))).filter(Boolean);
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// GET /api/materials/applications
exports.getApplications = (req, res) => {
  try {
    const materials = getMaterialsData();
    const allApps = materials.flatMap(m => m.applications || []);
    const applications = Array.from(new Set(allApps)).filter(Boolean).sort();
    res.json({ applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// GET /api/materials/search
exports.searchMaterials = (req, res) => {
  try {
    const materials = getMaterialsData();
    let results = [...materials];

    const {
      keyword,
      category,
      application,
      minRating,
      minDensity,
      maxDensity,
      minTensileStrength,
      maxTensileStrength,
      minSpecificStrength,
      minThermalConductivity,
      maxThermalConductivity,
      corrosionResistance,
      minCost,
      maxCost,
      minServiceTemp,
      sortBy
    } = req.query;

    // Filter by Application (Prioritized)
    if (application && application.trim() !== '' && application.toLowerCase() !== 'all') {
      const targetApp = application.trim().toLowerCase();
      results = results.filter(m => {
        if (!m.applications || !Array.isArray(m.applications)) return false;
        return m.applications.some(app => 
          app.toLowerCase().includes(targetApp) || targetApp.includes(app.toLowerCase())
        );
      });
    }

    // Filter by category
    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      results = results.filter(m => m.category && m.category.toLowerCase() === category.trim().toLowerCase());
    }

    // Filter by Minimum User Rating
    if (minRating !== undefined && minRating !== '') {
      const minR = parseFloat(minRating);
      if (!isNaN(minR)) {
        results = results.filter(m => (m.rating || 0) >= minR);
      }
    }

    // Filter by keyword (Name, Description, Category, Applications)
    if (keyword && keyword.trim() !== '') {
      const q = keyword.trim().toLowerCase();
      results = results.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.applications && m.applications.some(a => a.toLowerCase().includes(q)))
      );
    }

    // Filter by Density (g/cm³)
    if (minDensity !== undefined && minDensity !== '') {
      const minD = parseFloat(minDensity);
      if (!isNaN(minD)) {
        results = results.filter(m => m.properties?.density !== undefined && m.properties.density >= minD);
      }
    }
    if (maxDensity !== undefined && maxDensity !== '') {
      const maxD = parseFloat(maxDensity);
      if (!isNaN(maxD)) {
        results = results.filter(m => m.properties?.density !== undefined && m.properties.density <= maxD);
      }
    }

    // Filter by Tensile Strength (MPa)
    if (minTensileStrength !== undefined && minTensileStrength !== '') {
      const minTS = parseFloat(minTensileStrength);
      if (!isNaN(minTS)) {
        results = results.filter(m => m.properties?.tensileStrength !== undefined && m.properties.tensileStrength >= minTS);
      }
    }
    if (maxTensileStrength !== undefined && maxTensileStrength !== '') {
      const maxTS = parseFloat(maxTensileStrength);
      if (!isNaN(maxTS)) {
        results = results.filter(m => m.properties?.tensileStrength !== undefined && m.properties.tensileStrength <= maxTS);
      }
    }

    // Filter by Specific Strength (kN·m/kg)
    if (minSpecificStrength !== undefined && minSpecificStrength !== '') {
      const minSS = parseFloat(minSpecificStrength);
      if (!isNaN(minSS)) {
        results = results.filter(m => {
          const ss = m.properties?.specificStrength || (m.properties?.tensileStrength / m.properties?.density);
          return ss !== undefined && ss >= minSS;
        });
      }
    }

    // Filter by Thermal Conductivity (W/m·K)
    if (minThermalConductivity !== undefined && minThermalConductivity !== '') {
      const minTC = parseFloat(minThermalConductivity);
      if (!isNaN(minTC)) {
        results = results.filter(m => typeof m.properties?.thermalConductivity === 'number' && m.properties.thermalConductivity >= minTC);
      }
    }
    if (maxThermalConductivity !== undefined && maxThermalConductivity !== '') {
      const maxTC = parseFloat(maxThermalConductivity);
      if (!isNaN(maxTC)) {
        results = results.filter(m => typeof m.properties?.thermalConductivity === 'number' && m.properties.thermalConductivity <= maxTC);
      }
    }

    // Filter by Continuous Service Temperature (°C)
    if (minServiceTemp !== undefined && minServiceTemp !== '') {
      const minST = parseFloat(minServiceTemp);
      if (!isNaN(minST)) {
        results = results.filter(m => (m.properties?.maxServiceTemp || 0) >= minST);
      }
    }

    // Filter by Corrosion Resistance
    if (corrosionResistance && corrosionResistance.trim() !== '' && corrosionResistance.toLowerCase() !== 'all') {
      results = results.filter(m => 
        m.properties?.corrosionResistance &&
        m.properties.corrosionResistance.toLowerCase() === corrosionResistance.trim().toLowerCase()
      );
    }

    // Filter by Cost Tier (semantic or text)
    if ((minCost && minCost.trim() !== '') || (maxCost && maxCost.trim() !== '')) {
      const minRank = minCost ? (COST_RANK[minCost.trim().toLowerCase()] || 0) : 0;
      const maxRank = maxCost ? (COST_RANK[maxCost.trim().toLowerCase()] || 99) : 99;

      results = results.filter(m => {
        const costStr = (m.properties?.cost || '').toLowerCase();
        const itemRank = COST_RANK[costStr];
        if (itemRank !== undefined) {
          return itemRank >= minRank && itemRank <= maxRank;
        }
        return true;
      });
    }

    // Sorting & Ranking
    const sort = (sortBy || 'rating_desc').toLowerCase();

    results.sort((a, b) => {
      if (sort === 'rating_desc' || sort === 'rating') {
        const rDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(rDiff) > 0.001) return rDiff;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      if (sort === 'rating_asc') {
        return (a.rating || 0) - (b.rating || 0);
      }
      if (sort === 'specificstrength_desc') {
        const ssA = a.properties?.specificStrength || (a.properties?.tensileStrength / a.properties?.density) || 0;
        const ssB = b.properties?.specificStrength || (b.properties?.tensileStrength / b.properties?.density) || 0;
        return ssB - ssA;
      }
      if (sort === 'tensile_desc') {
        return (b.properties?.tensileStrength || 0) - (a.properties?.tensileStrength || 0);
      }
      if (sort === 'density_asc') {
        return (a.properties?.density || 0) - (b.properties?.density || 0);
      }
      if (sort === 'thermal_desc') {
        return (b.properties?.thermalConductivity || 0) - (a.properties?.thermalConductivity || 0);
      }
      if (sort === 'cost_asc') {
        const cA = COST_RANK[(a.properties?.cost || '').toLowerCase()] || 3;
        const cB = COST_RANK[(b.properties?.cost || '').toLowerCase()] || 3;
        return cA - cB;
      }
      return 0;
    });

    // Add rank based on current sorted order
    const rankedResults = results.map((m, idx) => ({
      ...m,
      rank: idx + 1
    }));

    res.json({ materials: rankedResults, count: rankedResults.length, total: materials.length });
  } catch (error) {
    console.error('Error searching materials:', error);
    res.status(500).json({ error: 'Failed to search materials' });
  }
};

// GET /api/materials/:id
exports.getMaterialById = (req, res) => {
  try {
    const materials = getMaterialsData();
    const id = parseInt(req.params.id, 10);
    const material = materials.find(m => m.id === id);

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(material);
  } catch (error) {
    console.error('Error fetching material by ID:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
};

// POST /api/materials/:id/ratings
exports.addMaterialRating = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rating, comment, userName, role, applicationTested } = req.body;

    if (!rating || isNaN(parseInt(rating, 10))) {
      return res.status(400).json({ message: 'A valid rating between 1 and 5 is required.' });
    }

    const numRating = Math.max(1, Math.min(5, parseInt(rating, 10)));
    const materials = getMaterialsData();
    const materialIndex = materials.findIndex(m => m.id === id);

    if (materialIndex === -1) {
      return res.status(404).json({ message: 'Material not found.' });
    }

    const material = materials[materialIndex];
    if (!material.reviews) {
      material.reviews = [];
    }

    const finalUserName = userName && userName.trim() ? userName.trim() : (req.user?.name || 'Verified Engineer');
    const finalRole = role && role.trim() ? role.trim() : 'Materials & Design Specialist';
    const finalApp = applicationTested && applicationTested.trim() ? applicationTested.trim() : 'Industrial Application';
    const finalComment = comment && comment.trim() ? comment.trim() : 'Validated material performance in target testing.';

    const newReview = {
      reviewId: 'rev-' + Date.now(),
      userName: finalUserName,
      role: finalRole,
      rating: numRating,
      applicationTested: finalApp,
      comment: finalComment,
      date: new Date().toISOString().split('T')[0]
    };

    material.reviews.unshift(newReview);
    const totalRatingSum = material.reviews.reduce((acc, r) => acc + r.rating, 0);
    material.rating = Number((totalRatingSum / material.reviews.length).toFixed(1));
    material.reviewCount = material.reviews.length;

    materials[materialIndex] = material;
    saveMaterialsData(materials);

    // Save to MySQL Material_Reviews table if database is active
    if (db) {
      try {
        await db.execute(
          'INSERT INTO Material_Reviews (material_id, user_name, rating, application_tested, comment) VALUES (?, ?, ?, ?, ?)',
          [id, finalUserName, numRating, finalApp, finalComment]
        );
      } catch (dbErr) {
        console.warn('Note: Could not insert into Material_Reviews table:', dbErr.message);
      }
    }

    res.status(201).json({
      message: 'Rating and review submitted successfully!',
      material
    });
  } catch (error) {
    console.error('Error adding material rating:', error);
    res.status(500).json({ message: 'Server error saving material rating.' });
  }
};
