// Rank in SQL before fetching record metadata, so large research catalogs stay bounded.
const db = require('../config/db');
const { ready, getCatalog, definitions, costRank, resistanceRank } = require('./catalog');
const { recommend, validateRequirements, numericRules } = require('./recommendation');
const factors = { strength: 'tensileStrength', lightness: 'density', cost: 'cost', thermal: 'thermalConductivity', stiffness: 'bulkModulus', vacuum: 'collectedVolatileCondensableMaterial' };
const ids = Object.fromEntries(definitions.map(([key], i) => [key, i + 1]));
const invert = new Set(['lightness', 'cost', 'vacuum']);
const cost = alias => `CASE ${alias}.text_value WHEN 'Low' THEN 1 WHEN 'Moderate' THEN 2 WHEN 'Medium' THEN 2 WHEN 'High' THEN 3 WHEN 'Very High' THEN 4 ELSE NULL END`;
const resistance = alias => `CASE ${alias}.text_value WHEN 'Poor' THEN 1 WHEN 'Fair' THEN 2 WHEN 'Moderate' THEN 2 WHEN 'Good' THEN 3 WHEN 'Excellent' THEN 4 ELSE NULL END`;
const base = 'FROM Material m JOIN Material_Category c ON c.category_id=m.category_id JOIN Data_Source s ON s.source_id=m.source_id';

async function recommendCatalog(input) {
  const requirements = validateRequirements(input);
  await ready;
  const bounds = {};
  // Read numeric index edges instead of grouping every property row and loading
  // millions of clustered Material pages just to find min/max values.
  for(const [factor,property] of Object.entries(factors)) {
    if(property==='cost') {
      const [[row]]=await db.execute(`SELECT MIN(${cost('mp')}) AS lo,MAX(${cost('mp')}) AS hi FROM Material_Property mp JOIN Material m ON m.material_id=mp.material_id JOIN Data_Source s ON s.source_id=m.source_id WHERE mp.property_id=? AND s.source_key IS NOT NULL AND COALESCE(s.import_state,'complete')='complete'`,[ids[property]]);
      bounds[factor]=row.lo==null?[0,0]:[Number(row.lo),Number(row.hi)];
    } else {
      const edge=async direction=>{
        const force=db.driver()==='mysql'?'FORCE INDEX (material_numeric_index)':'';
        const [[row]]=await db.execute(`SELECT mp.numeric_value AS value FROM Material_Property mp ${force} JOIN Material m ON m.material_id=mp.material_id JOIN Data_Source s ON s.source_id=m.source_id WHERE mp.property_id=? AND mp.numeric_value IS NOT NULL AND s.source_key IS NOT NULL AND COALESCE(s.import_state,'complete')='complete' ORDER BY mp.numeric_value ${direction} LIMIT 1`,[ids[property]]);
        return row?Number(row.value):0;
      };
      bounds[factor]=[await edge('ASC'),await edge('DESC')];
    }
  }
  const aliases = new Map();
  const joins = [];
  const expression = property => {
    if (!aliases.has(property)) {
      const alias = `v${aliases.size}`;
      aliases.set(property, alias);
      joins.push(`LEFT JOIN Material_Property ${alias} ON ${alias}.material_id=m.material_id AND ${alias}.property_id=${ids[property]}`);
    }
    return property === 'cost' ? cost(aliases.get(property)) : `${aliases.get(property)}.numeric_value`;
  };
  const where = [], params = [], active = [], scores = [];
  const weightTotal = Object.values(requirements.weights).reduce((a,b) => a+b,0);
  for (const [factor, property] of Object.entries(factors)) {
    const weight = requirements.weights[factor];
    if (!weight) continue;
    const value = expression(property), [lo, hi] = bounds[factor];
    active.push(`${value} IS NOT NULL`);
    const normalized = hi === lo ? '1' : invert.has(factor) ? `((${hi}-${value})/${hi-lo})` : `((${value}-${lo})/${hi-lo})`;
    scores.push(`CASE WHEN ${value} IS NULL THEN 0 ELSE ${normalized}*${weight/weightTotal*100} END`);
  }
  where.push(`(${active.join(' OR ')})`);
  for (const [key,[property, operation]] of Object.entries(numericRules)) {
    if (requirements[key] === undefined || ['volume','maxWeight'].includes(key)) continue;
    const value = expression(property);
    where.push(`(${value} IS NOT NULL AND ${value}${operation==='min'?'>=':'<='}?)`);
    params.push(requirements[key]);
  }
  if (requirements.maxWeight) {
    const value = expression('density');
    where.push(`(${value} IS NOT NULL AND ${value}<=?)`);
    params.push(requirements.maxWeight*1000/requirements.volume);
  }
  for (const [key,column] of [['category','c.name'],['dataKind','s.data_kind']]) {
    if (requirements[key]) { where.push(`${column}=?`); params.push(requirements[key]); }
  }
  if (requirements.keyword) {
    const term = `%${requirements.keyword.replace(/[!%_]/g,'!$&')}%`;
    where.push(`(LOWER(m.name) LIKE LOWER(?) ESCAPE '!' OR LOWER(COALESCE(m.description,'')) LIKE LOWER(?) ESCAPE '!' OR LOWER(c.name) LIKE LOWER(?) ESCAPE '!' OR LOWER(COALESCE(m.search_terms,'')) LIKE LOWER(?) ESCAPE '!' OR EXISTS (SELECT 1 FROM Material_Application ma JOIN Application a ON a.application_id=ma.application_id WHERE ma.material_id=m.material_id AND LOWER(a.name) LIKE LOWER(?) ESCAPE '!'))`);
    params.push(term,term,term,term,term);
  }
  for (const [key,table,column] of [['application','Application','application_id'],['process','Manufacturing_Process','process_id']]) {
    if (!requirements[key]) continue;
    const association = key==='application'?'Material_Application':'Material_Process';
    where.push(`EXISTS (SELECT 1 FROM ${association} ma JOIN ${table} a ON a.${column}=ma.${column} WHERE ma.material_id=m.material_id AND a.name=?)`);
    params.push(requirements[key]);
  }
  if (requirements.maxCost) { const value=expression('cost'); where.push(`(${value} IS NOT NULL AND ${value}<=?)`); params.push(costRank[requirements.maxCost]); }
  if (requirements.corrosionResistance) {
    expression('corrosionResistance'); const value=resistance(aliases.get('corrosionResistance'));
    where.push(`(${value} IS NOT NULL AND ${value}>=?)`); params.push(resistanceRank[requirements.corrosionResistance]);
  }
  const priorityIds = [...new Set(Object.entries(factors).filter(([factor])=>requirements.weights[factor]>0).map(([,prop])=>ids[prop]))];
  const eligibility = `JOIN (SELECT DISTINCT material_id FROM Material_Property WHERE property_id IN (${priorityIds.join(',')}) AND (numeric_value IS NOT NULL OR text_value IS NOT NULL)) eligible ON eligible.material_id=m.material_id`;
  const joined = `${base} ${joins.join(' ')}`, ranked = `${base} ${eligibility} ${joins.join(' ')}`, predicate = where.join(' AND ');
  const [[totalRow]] = await db.execute(`SELECT COUNT(*) AS total FROM Material m JOIN Data_Source s ON s.source_id=m.source_id WHERE s.source_key IS NOT NULL AND COALESCE(s.import_state,'complete')='complete'`);
  const [[countRow]] = await db.execute(`SELECT COUNT(*) AS total ${ranked} WHERE s.source_key IS NOT NULL AND COALESCE(s.import_state,'complete')='complete' AND ${predicate}`,params);
  const [top] = await db.execute(`SELECT m.material_id,ROUND(${scores.join('+')},1) AS score ${ranked} WHERE s.source_key IS NOT NULL AND COALESCE(s.import_state,'complete')='complete' AND ${predicate} ORDER BY score DESC,m.material_id LIMIT 50`,params);
  const [excludedRows] = await db.execute(`SELECT m.material_id ${joined} WHERE s.source_key IS NOT NULL AND COALESCE(s.import_state,'complete')='complete' AND NOT (${predicate}) ORDER BY m.material_id LIMIT 100`,params);
  const result = recommend(await getCatalog(top.map(r=>r.material_id)),requirements,{bounds});
  const excluded = recommend(await getCatalog(excludedRows.map(r=>r.material_id)),requirements,{bounds}).excluded;
  return {...result, total:Number(totalRow.total),count:Number(countRow.total),shown:top.length,excluded,excludedCount:Number(totalRow.total)-Number(countRow.total)};
}
module.exports = { recommendCatalog };
