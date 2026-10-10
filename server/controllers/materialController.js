const { getCatalog, listMaterials, getSummary } = require("../services/catalog");
const { recommendCatalog } = require("../services/catalogRecommendation");
const { validateRequirements } = require("../services/recommendation");
const respond = (handler) => async (req, res) => {
  try { await handler(req, res); }
  catch (e) { console.error(e); res.status(e.message.startsWith("Enter") ? 400 : 503).json({ message: e.message.startsWith("Enter") ? e.message : "The MySQL material database is unavailable. Please retry." }); }
};
exports.getAllMaterials = respond(async (req, res) => res.json(await listMaterials(req.query)));
exports.getSummary = respond(async (req, res) => res.json(await getSummary()));
exports.getCategories = respond(async (req, res) => res.json({ categories: (await getSummary()).categories.map(c => c.name) }));
exports.getApplications = respond(async (req, res) => res.json({ applications: (await getSummary()).applications }));
exports.searchMaterials = respond(async (req, res) => res.json(await recommendCatalog(req.query)));
exports.getRecommendations = async (req, res) => {
  try { validateRequirements(req.body); }
  catch(e) { return res.status(400).json({message:e.message}); }
  try { res.json(await recommendCatalog(req.body)); }
  catch (e) { console.error(e); res.status(503).json({ message: "The MySQL material database is unavailable. Please retry." }); }
};
exports.getMaterialById = respond(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(404).json({ message: "Material not found." });
  const [material] = await getCatalog([id]);
  if (!material) return res.status(404).json({ message: "Material not found." });
  res.json(material);
});
