const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
const db = require("../config/db");
const { ready, definitions } = require("../services/catalog");
const propertyIds = new Map(definitions.map(([key], i) => [key, i + 1]));
function validate(bundle) {
  const s = bundle.source;
  if (!s || !/^[a-z0-9-]{1,100}$/.test(s.key || "") || !s.name || !/^https:\/\//.test(s.url || "") || !s.license || !["experimental", "computed", "literature-extracted"].includes(s.kind) || !/^[a-f0-9]{64}$/.test(s.checksum || "")) throw new Error("Import needs source key, name, HTTPS URL, license, data kind and SHA-256 checksum.");
  if (!Array.isArray(bundle.materials) || !bundle.materials.length) throw new Error("Import has no materials.");
  const ids = new Set();
  for (const m of bundle.materials) {
    if (!m.externalId || String(m.externalId).length > 100 || ids.has(m.externalId) || !m.name || m.name.length > 255 || !m.category || m.category.length > 80 || !/^https:\/\//.test(m.sourceUrl || "")) throw new Error("Invalid or duplicate source record.");
    ids.add(m.externalId);
    for (const [key, value] of Object.entries(m.properties || {})) {
      if (!propertyIds.has(key)) throw new Error(`Unknown property ${key}.`);
      if (value !== null && typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value))) throw new Error(`Invalid ${key}.`);
      if (typeof value === "string" && value.length > 100) throw new Error(`Property ${key} is too long.`);
    }
  }
  return bundle;
}
async function importBundleOnce(bundle, options = {}) {
  validate(bundle);
  await ready;
  if (db.driver() !== "mysql") throw new Error("Catalog imports require MySQL.");
  const s = bundle.source;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO Data_Source (source_key,name,note,url,license,data_kind,version,checksum,imported_at) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE name=VALUES(name),note=VALUES(note),url=VALUES(url),license=VALUES(license),data_kind=VALUES(data_kind),version=VALUES(version),checksum=VALUES(checksum),imported_at=CURRENT_TIMESTAMP`, [s.key,s.name,s.note || "",s.url,s.license,s.kind,s.version || "",s.checksum]);
    const [[source]] = await connection.execute("SELECT source_id FROM Data_Source WHERE source_key=?", [s.key]);
    await connection.execute('UPDATE Data_Source SET import_state=? WHERE source_id=?',[options.refreshSummary===false?'importing':'complete',source.source_id]);
    const categories = new Map();
    for (const name of [...new Set(bundle.materials.map(m => m.category))]) {
      await connection.execute("INSERT IGNORE INTO Material_Category (name) VALUES (?)", [name]);
      const [[category]] = await connection.execute("SELECT category_id FROM Material_Category WHERE name=?", [name]);
      categories.set(name, category.category_id);
    }
    for (let offset = 0; offset < bundle.materials.length; offset += 500) {
      const batch = bundle.materials.slice(offset, offset + 500);
      await connection.query(`INSERT INTO Material (name,description,category_id,source_id,external_id,source_url,metadata_json,search_terms) VALUES ? ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),category_id=VALUES(category_id),source_url=VALUES(source_url),metadata_json=VALUES(metadata_json),search_terms=VALUES(search_terms)`, [batch.map(m => [m.name,m.description || "",categories.get(m.category),source.source_id,m.externalId,m.sourceUrl,JSON.stringify(m.metadata || {}),(m.metadata?.searchAliases || []).join(" ")])]);
      const [rows] = await connection.query("SELECT material_id,external_id FROM Material WHERE source_id=? AND external_id IN (?)", [source.source_id,batch.map(m => m.externalId)]);
      const materialIds = new Map(rows.map(r => [r.external_id,r.material_id]));
      // Replace properties of these source records; never retain values absent in a refresh.
      await connection.query("DELETE FROM Material_Property WHERE material_id IN (?)", [rows.map(r => r.material_id)]);
      const values = batch.flatMap(m => Object.entries(m.properties || {}).filter(([,v]) => v !== null).map(([k,v]) => [materialIds.get(m.externalId),propertyIds.get(k),typeof v === "number" ? v : null,typeof v === "string" ? v : null]));
      if (values.length) await connection.query("INSERT INTO Material_Property (material_id,property_id,numeric_value,text_value) VALUES ?", [values]);
    }
    await connection.commit();
    if (options.refreshSummary !== false) await require('../services/catalogSummary').refreshSourceSummary(s.key);
    return { source: s.key, records: bundle.materials.length };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
async function importBundle(bundle, options = {}) {
  for(let attempt=0;attempt<3;attempt++) {
    try { return await importBundleOnce(bundle,options); }
    catch(error) {
      if(!['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code)||attempt===2) throw error;
      await new Promise(resolve=>setTimeout(resolve,250*2**attempt));
    }
  }
}
if (require.main === module) (async () => {
  try {
    if (!process.argv[2]) throw new Error("Usage: node server/scripts/import-catalog.js <normalized-source.json>");
    if (process.argv[2].endsWith('.jsonl')) {
      const lines = require('readline').createInterface({input:fs.createReadStream(process.argv[2]),crlfDelay:Infinity});
      let source, batch=[],count=0,expected;
      for await (const line of lines) {
        if (!line.trim()) continue;
        const item=JSON.parse(line);
        if (!source) { source=item.source; expected=item.records; continue; }
        batch.push(item);
        if (batch.length===5000) { await importBundle({source,materials:batch},{refreshSummary:false});count+=batch.length;batch=[]; if(count%10000===0) console.log(`${source.key}: ${count.toLocaleString()} imported`); }
      }
      if(batch.length) { await importBundle({source,materials:batch},{refreshSummary:false});count+=batch.length; }
      if(expected!==undefined && count!==expected) throw new Error(`Incomplete stream: ${count}/${expected}; rerun the complete snapshot to finish.`);
      await require('../services/catalogSummary').refreshSourceSummary(source.key);
      await db.execute("UPDATE Data_Source SET import_state='complete' WHERE source_key=?",[source.key]);
      console.log({source:source.key,records:count});
    } else console.log(await importBundle(JSON.parse(fs.readFileSync(process.argv[2], "utf8"))));
  } finally { await db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { importBundle, validate };
