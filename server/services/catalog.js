const db = require("../config/db");
const costRank = { Low: 1, Moderate: 2, Medium: 2, High: 3, "Very High": 4 };
const resistanceRank = { Poor: 1, Fair: 2, Moderate: 2, Good: 3, Excellent: 4 };
const definitions = [
  ["density", "Density", "g/cm³"],
  ["tensileStrength", "Tensile strength", "MPa"],
  ["thermalConductivity", "Thermal conductivity", "W/m·K"],
  ["maxServiceTemp", "Service temperature ceiling", "°C"],
  ["corrosionResistance", "Corrosion resistance", "qualitative"],
  ["cost", "Relative cost", "tier"],
  ["bulkModulus", "Bulk modulus (Voigt)", "GPa"],
  ["shearModulus", "Shear modulus (Voigt)", "GPa"],
  ["yieldStrength", "Yield strength", "MPa"],
  ["youngModulus", "Young’s modulus", "GPa"],
  ["testTemperature", "Test temperature", "°C"],
  ["hardnessVickers", "Vickers hardness", "HV"],
  ["thermalExpansion", "Thermal expansion (20–100 °C)", "µm/m·K"],
  ["specificHeat", "Specific heat capacity", "J/kg·K"],
  ["electricalResistivity", "Electrical resistivity", "µΩ·m"],
  ["magnetizable", "Magnetizable", ""],
  ["elongation", "Elongation (A5)", "%"],
  ["elongationA80", "Elongation (A80)", "%"],
  ["elongationUnspecified", "Elongation (gauge unspecified)", "%"],
  ["elasticModulus", "Elastic modulus (method unspecified)", "GPa"],
  ["hardnessBrinell", "Brinell hardness", "HB"],
  ["hardnessRockwellC", "Rockwell C hardness", "HRC"],
  ["hardnessRockwellB", "Rockwell B hardness", "HRB"],
  ["hardnessRockwellR", "Rockwell R hardness", "HRR"],
  ["hardnessRockwellM", "Rockwell M hardness", "HRM"],
  ["hardnessShoreA", "Shore A hardness", "Shore A"],
  ["hardnessShore00", "Shore 00 hardness", "Shore 00"],
  ["meltingPoint", "Melting point", "°C"],
  ["electricalConductivityIACS", "Electrical conductivity", "% IACS"],
  ["totalMassLoss", "Total mass loss (TML)", "%"],
  ["collectedVolatileCondensableMaterial", "Collected volatile condensable material (CVCM)", "%"],
  ["waterVaporRegained", "Water vapor regained (WVR)", "%"],
  ["thermalConductivityInPlane", "Thermal conductivity (in-plane)", "W/m·K"],
  ["thermalConductivityThroughThickness", "Thermal conductivity (through thickness)", "W/m·K"],
  ["bandGap", "Band gap", "eV"],
  ["formationEnergy", "Formation energy per atom", "eV/atom"],
  ["bulkModulusVRH", "Bulk modulus (Voigt–Reuss–Hill)", "GPa"],
  ["shearModulusVRH", "Shear modulus (Voigt–Reuss–Hill)", "GPa"],
  ["poissonRatio", "Poisson ratio", ""],
  ["thermalExpansionCoefficient", "Thermal expansion coefficient (source conditions)", "µm/m·K"],
  ["emissivity", "Emissivity", ""],
  ["solarAbsorptivity", "Solar absorptivity", ""],
  ["reusableTemperatureLimit", "Reusable temperature limit (TPSX)", "°C"],
  ["singleUseTemperatureLimit", "Single-use temperature limit (TPSX)", "°C"],
];
const ready = (async () => {
  await db.ready;
  const driver = db.driver();
  if (driver === "mysql") {
    const base = require("fs").readFileSync(require("path").join(__dirname, "../database/schema.sql"), "utf8");
    for (const sql of base.replace(/--[^\n]*/g, "").split(";").filter(s => s.trim())) await db.execute(sql);
  }
  const key =
    driver === "mysql"
      ? "INTEGER PRIMARY KEY AUTO_INCREMENT"
      : "INTEGER PRIMARY KEY AUTOINCREMENT";
  const tables = [
    `CREATE TABLE IF NOT EXISTS Data_Source (source_id INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL, note TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS Material_Category (category_id INTEGER PRIMARY KEY, name VARCHAR(80) UNIQUE NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS Material (material_id INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, category_id INTEGER NOT NULL, source_id INTEGER NOT NULL, FOREIGN KEY(category_id) REFERENCES Material_Category(category_id), FOREIGN KEY(source_id) REFERENCES Data_Source(source_id))`,
    `CREATE TABLE IF NOT EXISTS Property (property_id INTEGER PRIMARY KEY, property_key VARCHAR(80) UNIQUE NOT NULL, name VARCHAR(100) NOT NULL, unit VARCHAR(80) NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS Material_Property (material_id INTEGER NOT NULL, property_id INTEGER NOT NULL, numeric_value DOUBLE, text_value VARCHAR(100), PRIMARY KEY(material_id, property_id), FOREIGN KEY(material_id) REFERENCES Material(material_id), FOREIGN KEY(property_id) REFERENCES Property(property_id))`,
    `CREATE TABLE IF NOT EXISTS Application (application_id INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS Application_Property (application_id INTEGER NOT NULL, property_id INTEGER NOT NULL, weight DOUBLE NOT NULL DEFAULT 1, PRIMARY KEY(application_id, property_id), FOREIGN KEY(application_id) REFERENCES Application(application_id), FOREIGN KEY(property_id) REFERENCES Property(property_id))`,
    `CREATE TABLE IF NOT EXISTS Material_Application (material_id INTEGER NOT NULL, application_id INTEGER NOT NULL, PRIMARY KEY(material_id, application_id), FOREIGN KEY(material_id) REFERENCES Material(material_id), FOREIGN KEY(application_id) REFERENCES Application(application_id))`,
    `CREATE TABLE IF NOT EXISTS Manufacturing_Process (process_id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS Material_Process (material_id INTEGER NOT NULL, process_id INTEGER NOT NULL, PRIMARY KEY(material_id, process_id), FOREIGN KEY(material_id) REFERENCES Material(material_id), FOREIGN KEY(process_id) REFERENCES Manufacturing_Process(process_id))`,
    `CREATE TABLE IF NOT EXISTS Project_Requirement (project_id INTEGER NOT NULL, requirement_key VARCHAR(100) NOT NULL, value TEXT NOT NULL, PRIMARY KEY(project_id, requirement_key), FOREIGN KEY(project_id) REFERENCES Projects(project_id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS Recommendation (recommendation_id ${key}, project_id INTEGER NOT NULL, material_id INTEGER NOT NULL, score DOUBLE NOT NULL, explanation TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(project_id) REFERENCES Projects(project_id) ON DELETE CASCADE, FOREIGN KEY(material_id) REFERENCES Material(material_id))`,
    `CREATE TABLE IF NOT EXISTS Search_History (search_id ${key}, user_id INTEGER NOT NULL, requirements TEXT NOT NULL, result_count INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES Users(user_id) ON DELETE CASCADE)`,
  ];
  for (const sql of tables) await db.execute(sql);

  const migrations = {
    Data_Source: { source_key: "VARCHAR(100)", url: "TEXT", license: "VARCHAR(100)", data_kind: "VARCHAR(40)", version: "VARCHAR(100)", checksum: "VARCHAR(64)", imported_at: "TIMESTAMP NULL", summary_json: "MEDIUMTEXT", import_state: "VARCHAR(20) DEFAULT 'complete'" },
    Material: { external_id: "VARCHAR(100)", source_url: "TEXT", metadata_json: "TEXT", search_terms: "TEXT" },
  };
  for (const [table, columns] of Object.entries(migrations)) {
    const [existing] = driver === "mysql"
      ? await db.execute(`SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?`, [table])
      : [db.tableColumns(table)];
    for (const [name, type] of Object.entries(columns))
      if (!existing.some(c => c.name === name)) await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
  if (driver === "mysql") {
    const connection = await db.getConnection();
    try {
      for (const [table, keyColumn] of [["Data_Source", "source_id"], ["Material_Category", "category_id"], ["Material", "material_id"], ["Application", "application_id"]]) {
        const [[column]] = await connection.execute("SELECT EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?", [table, keyColumn]);
        if (!column.EXTRA.includes("auto_increment")) {
          // Only adds an allocator; existing IDs and referenced column types are preserved.
          await connection.execute("SET FOREIGN_KEY_CHECKS=0");
          await connection.execute(`ALTER TABLE ${table} MODIFY ${keyColumn} INTEGER NOT NULL AUTO_INCREMENT`);
          await connection.execute("SET FOREIGN_KEY_CHECKS=1");
        }
      }
    } finally { await connection.execute("SET FOREIGN_KEY_CHECKS=1"); connection.release(); }
  }
  for (const sql of [
    "CREATE UNIQUE INDEX source_key_unique ON Data_Source(source_key)",
    "CREATE UNIQUE INDEX material_external_unique ON Material(source_id, external_id)",
    "CREATE INDEX material_name_index ON Material(name)",
    "CREATE INDEX material_numeric_index ON Material_Property(property_id, numeric_value)",
  ]) { try { await db.execute(sql); } catch (e) { if (e.code !== "ER_DUP_KEYNAME" && !e.message.includes("already exists")) throw e; } }
  const insert = driver === "mysql" ? "INSERT IGNORE" : "INSERT OR IGNORE";
  for (let i = 0; i < definitions.length; i++)
    await db.execute(`${insert} INTO Property (property_id, property_key, name, unit) VALUES (?, ?, ?, ?)`, [i + 1, ...definitions[i]]);

})();


const active = "s.source_key IS NOT NULL AND COALESCE(s.import_state,'complete')='complete'";
function filters(input = {}) {
  const where = [active], params = [];
  if (input.collection === "engineering") where.push("s.data_kind='literature-extracted'");
  else if (input.collection === "research") where.push("s.data_kind IN ('computed','experimental')");
  else if (input.collection && input.collection !== "all") throw new Error("Enter a valid catalog collection.");
  for (const [key, column] of [["category", "c.name"], ["source", "s.source_key"], ["kind", "s.data_kind"]]) {
    if (input[key]) { where.push(`${column}=?`); params.push(String(input[key]).slice(0, 255)); }
  }
  if (input.q) {
    where.push("(m.name LIKE ? ESCAPE '!' OR m.external_id LIKE ? ESCAPE '!' OR m.description LIKE ? ESCAPE '!' OR m.search_terms LIKE ? ESCAPE '!')");
    const term = `%${String(input.q).slice(0, 255).replace(/[!%_]/g, '!$&')}%`;
    params.push(term, term, term, term);
  }
  if (input.property) {
    if (!definitions.some(([key]) => key === input.property)) throw new Error("Enter a valid reported property.");
    where.push("EXISTS (SELECT 1 FROM Material_Property available JOIN Property available_property ON available_property.property_id=available.property_id WHERE available.material_id=m.material_id AND available_property.property_key=? AND (available.numeric_value IS NOT NULL OR available.text_value IS NOT NULL))");
    params.push(input.property);
  }
  return { where: where.join(" AND "), params };
}
const joins = "FROM Material m JOIN Material_Category c ON m.category_id=c.category_id JOIN Data_Source s ON m.source_id=s.source_id";
async function getCatalog(ids) {
  await ready;
  if (ids && !ids.length) return [];
  const scope = ids ? ` AND m.material_id IN (${ids.map(() => "?").join(",")})` : "";
  const [rows] = await db.execute(`SELECT m.material_id, m.name, m.description, m.external_id, m.source_url, m.metadata_json, c.name AS category, s.name AS source, s.note AS source_note, s.url AS dataset_url, s.license, s.data_kind, s.version, s.imported_at, p.property_key, p.unit, mp.numeric_value, mp.text_value ${joins} LEFT JOIN Material_Property mp ON mp.material_id=m.material_id LEFT JOIN Property p ON p.property_id=mp.property_id WHERE ${active}${scope} ORDER BY m.material_id`, ids || []);
  const materials = new Map();
  for (const row of rows) {
    if (!materials.has(row.material_id)) materials.set(row.material_id, {
      id: row.material_id, name: row.name, description: row.description,
      category: row.category, externalId: row.external_id, source: row.source,
      sourceNote: row.source_note, sourceUrl: row.source_url || row.dataset_url,
      datasetUrl: row.dataset_url, license: row.license, dataKind: row.data_kind,
      sourceVersion: row.version, importedAt: row.imported_at,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
      properties: {}, applications: [], processes: [],
    });
    if (row.property_key) materials.get(row.material_id).properties[row.property_key] = row.numeric_value === null ? row.text_value : Number(row.numeric_value);
  }
  if (!materials.size) return [];
  // Scope association queries too: a detail request must not scan all associations.
  const associationScope = ids ? ` WHERE ma.material_id IN (${ids.map(() => "?").join(",")})` : "";
  const [apps] = await db.execute(`SELECT ma.material_id, a.name FROM Material_Application ma JOIN Application a ON a.application_id=ma.application_id${associationScope}`, ids || []);
  const [processes] = await db.execute(`SELECT ma.material_id, p.name FROM Material_Process ma JOIN Manufacturing_Process p ON p.process_id=ma.process_id${associationScope}`, ids || []);
  for (const a of apps) materials.get(a.material_id)?.applications.push(a.name);
  for (const p of processes) materials.get(p.material_id)?.processes.push(p.name);
  for (const m of materials.values()) {
    const { density, tensileStrength } = m.properties;
    m.properties.specificStrength = Number.isFinite(density) && density > 0 && Number.isFinite(tensileStrength) ? Number((tensileStrength / density).toFixed(1)) : null;
  }
  const ordered = [...materials.values()];
  return ids ? ids.map(id => materials.get(id)).filter(Boolean) : ordered;
}
async function listMaterials(input = {}) {
  await ready;
  const page = Math.max(1, Number.parseInt(input.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(input.limit, 10) || 24));
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset) || offset > 10000000) throw new Error("Enter a valid page.");
  const { where, params } = filters(input);
  let total;
  if (!input.q && !input.property) {
    const summary=await getSummary();
    total=summary.sources.filter(s=>(!input.source||s.sourceKey===input.source)&&(!input.kind||s.dataKind===input.kind)&&(input.collection!=='engineering'||s.dataKind==='literature-extracted')&&(input.collection!=='research'||['computed','experimental'].includes(s.dataKind))).reduce((sum,s)=>sum+s.count,0);
    // Source/category intersections use the original SQL count, not the global category total.
    if(input.category) total=undefined;
  }
  if(total===undefined) {
    const [[count]] = await db.execute(`SELECT COUNT(*) AS total ${joins} WHERE ${where}`, params);
    total=Number(count.total);
  }
  if(!total) return {materials:[],total:0,page,limit,pages:0};
  const property = { density: ["density", "ASC"], strength: ["tensileStrength", "DESC"], bulk: ["bulkModulus", "DESC"] }[input.sort];
  const sortJoin = property ? "LEFT JOIN Material_Property sort_value ON sort_value.material_id=m.material_id AND sort_value.property_id=(SELECT property_id FROM Property WHERE property_key=?)" : "";
  const order = property ? `sort_value.numeric_value IS NULL, sort_value.numeric_value ${property[1]}, m.name, m.material_id` : "m.name, m.material_id";
  // Integers validated above are embedded because some MySQL prepared-statement versions reject LIMIT bindings.
  const [rows] = await db.execute(`SELECT m.material_id ${joins} ${sortJoin} WHERE ${where} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, property ? [property[0], ...params] : params);
  return { materials: await getCatalog(rows.map(r => r.material_id)), total, page, limit, pages: Math.ceil(total / limit) };
}
async function getSummary() {
  await ready;
  const [rows] = await db.execute(`SELECT source_key AS sourceKey,name,url,note,data_kind AS dataKind,license,version,checksum,imported_at AS importedAt,summary_json FROM Data_Source WHERE source_key IS NOT NULL AND COALESCE(import_state,'complete')='complete' ORDER BY name`);
  const categoriesByName = new Map(), coverageByKey = new Map(), sources=[];
  for (const row of rows) {
    const snapshot = row.summary_json ? JSON.parse(row.summary_json) : await require('./catalogSummary').refreshSourceSummary(row.sourceKey);
    if (!snapshot.count) continue;
    const {summary_json, ...source}=row;
    sources.push({...source,count:snapshot.count});
    for (const category of snapshot.categories) {
      if (!categoriesByName.has(category.name)) categoriesByName.set(category.name,{name:category.name,count:0,engineeringCount:0,researchCount:0});
      const target=categoriesByName.get(category.name),count=Number(category.count);
      target.count+=count;
      target[row.dataKind==='literature-extracted'?'engineeringCount':'researchCount']+=count;
    }
    for (const item of snapshot.coverage) coverageByKey.set(item.propertyKey,(coverageByKey.get(item.propertyKey)||0)+Number(item.count));
  }
  const categories=[...categoriesByName.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const coverage=definitions.filter(([key])=>coverageByKey.has(key)).map(([propertyKey,name,unit])=>({propertyKey,name,unit,count:coverageByKey.get(propertyKey)}));
  const [applications] = await db.execute(`SELECT DISTINCT a.name FROM Application a JOIN Material_Application ma ON ma.application_id=a.application_id JOIN Material m ON m.material_id=ma.material_id JOIN Data_Source s ON s.source_id=m.source_id WHERE ${active} ORDER BY a.name`);
  return {total:sources.reduce((a,s)=>a+s.count,0),database:db.driver(),categories,sources,applications:applications.map(a=>a.name),coverage};
}
module.exports = { ready, getCatalog, listMaterials, getSummary, definitions, costRank, resistanceRank };
