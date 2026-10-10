const db = require("../../config/db");
const seed = require("./materials.json").materials;
const { definitions } = require("../../services/catalog");
module.exports = async function () {
const driver = db.driver();
  const insert = driver === "mysql" ? "INSERT IGNORE" : "INSERT OR IGNORE";
  await db.execute(`${insert} INTO Data_Source (source_id, name, note) VALUES (1, ?, ?)`, [
    "Imported project reference dataset",
    "Indicative values inherited from the original project. No supplier datasheets or test methods were supplied. Verify grade, condition, direction, and operating environment before engineering use.",
  ]);
  const categories = [...new Set(seed.map((m) => m.category))];
  for (let i = 0; i < categories.length; i++)
    await db.execute(`${insert} INTO Material_Category VALUES (?, ?)`, [
      i + 1,
      categories[i],
    ]);
  for (let i = 0; i < definitions.length; i++)
    await db.execute(`${insert} INTO Property VALUES (?, ?, ?, ?)`, [
      i + 1,
      ...definitions[i],
    ]);
  const applications = [...new Set(seed.flatMap((m) => m.applications))].sort();
  for (let i = 0; i < applications.length; i++) {
    await db.execute(`${insert} INTO Application VALUES (?, ?)`, [
      i + 1,
      applications[i],
    ]);
    for (let j = 0; j < definitions.length; j++)
      await db.execute(`${insert} INTO Application_Property VALUES (?, ?, ?)`, [
        i + 1,
        j + 1,
        1,
      ]);
  }
  for (const m of seed) {
    await db.execute(`${insert} INTO Material (material_id, name, description, category_id, source_id) VALUES (?, ?, ?, ?, 1)`, [
      m.id,
      m.name,
      m.description,
      categories.indexOf(m.category) + 1,
    ]);
    for (let i = 0; i < definitions.length; i++) {
      const v = m.properties[definitions[i][0]];
      await db.execute(`${insert} INTO Material_Property VALUES (?, ?, ?, ?)`, [
        m.id,
        i + 1,
        typeof v === "number" ? v : null,
        typeof v === "string" ? v : null,
      ]);
    }
    for (const a of m.applications)
      await db.execute(`${insert} INTO Material_Application VALUES (?, ?)`, [
        m.id,
        applications.indexOf(a) + 1,
      ]);
  }
await db.execute("UPDATE Data_Source SET source_key=?, url=?, license=?, data_kind=?, version=? WHERE source_id=1", ["test-fixture", "https://example.org/test-fixture", "Test only", "experimental", "fixture"]);
};
