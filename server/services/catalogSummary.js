const db = require('../config/db');
async function refreshSourceSummary(key) {
  const [categories] = await db.execute(`SELECT c.name,COUNT(*) AS count FROM Material m JOIN Material_Category c ON c.category_id=m.category_id JOIN Data_Source s ON s.source_id=m.source_id WHERE s.source_key=? GROUP BY c.category_id,c.name`,[key]);
  const [coverage] = await db.execute(`SELECT p.property_key AS propertyKey,COUNT(*) AS count FROM Material_Property mp JOIN Property p ON p.property_id=mp.property_id JOIN Material m ON m.material_id=mp.material_id JOIN Data_Source s ON s.source_id=m.source_id WHERE s.source_key=? AND (mp.numeric_value IS NOT NULL OR mp.text_value IS NOT NULL) GROUP BY p.property_id,p.property_key`,[key]);
  const summary = {count:categories.reduce((a,c)=>a+Number(c.count),0),categories,coverage};
  await db.execute('UPDATE Data_Source SET summary_json=? WHERE source_key=?',[JSON.stringify(summary),key]);
  return summary;
}
module.exports={refreshSourceSummary};
