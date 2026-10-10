const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { checkProjectAccess } = require("../controllers/projectController");
const { getCatalog, ready } = require("../services/catalog");
const {
  recommend,
  validateRequirements,
} = require("../services/recommendation");
const db = require("../config/db");
const { recommendCatalog } = require("../services/catalogRecommendation");
const router = express.Router({ mergeParams: true });
router.use(protect);
router.get("/", async (req, res) => {
  try {
    await ready;
    const access = await checkProjectAccess(req.params.id, req.user.id);
    if (!access)
      return res
        .status(404)
        .json({ message: "Project not found or unauthorized." });
    const [rows] = await db.execute(
      "SELECT requirement_key, value FROM Project_Requirement WHERE project_id = ?",
      [req.params.id],
    );
    const requirements = Object.fromEntries(
      rows.map((r) => [r.requirement_key, JSON.parse(r.value)]),
    );
    const [saved] = await db.execute(
      "SELECT material_id, score, explanation, created_at FROM Recommendation WHERE project_id = ? ORDER BY score DESC",
      [req.params.id],
    );
    res.json({
      requirements,
      recommendations: saved.map((r) => ({
        ...r,
        explanation: JSON.parse(r.explanation),
      })),
    });
  } catch (e) {
    res.status(500).json({ message: "Unable to load project selection." });
  }
});
router.put("/", async (req, res) => {
  let connection;
  try {
    await ready;
    const access = await checkProjectAccess(req.params.id, req.user.id);
    if (!access?.canWrite)
      return res.status(403).json({ message: "Write permission is required." });
    const requirements = validateRequirements(req.body.requirements);
    const result = await recommendCatalog(requirements);
    connection = await db.getConnection();
    await connection.beginTransaction();
    await connection.execute(
      "DELETE FROM Project_Requirement WHERE project_id = ?",
      [req.params.id],
    );
    for (const [key, value] of Object.entries(requirements))
      await connection.execute(
        "INSERT INTO Project_Requirement VALUES (?, ?, ?)",
        [req.params.id, key, JSON.stringify(value)],
      );
    await connection.execute(
      "DELETE FROM Recommendation WHERE project_id = ?",
      [req.params.id],
    );
    for (const m of result.materials.slice(0, 50))
      await connection.execute(
        "INSERT INTO Recommendation (project_id, material_id, score, explanation) VALUES (?, ?, ?, ?)",
        [
          req.params.id,
          m.id,
          m.score,
          JSON.stringify({ reasons: m.reasons, breakdown: m.breakdown }),
        ],
      );
    await connection.execute(
      "INSERT INTO Search_History (user_id, requirements, result_count) VALUES (?, ?, ?)",
      [req.user.id, JSON.stringify(requirements), result.count],
    );
    await connection.commit();
    res.json({ message: "Selection saved.", ...result });
  } catch (e) {
    if (connection) await connection.rollback();
    res.status(400).json({ message: e.message });
  } finally {
    connection?.release();
  }
});
module.exports = router;
