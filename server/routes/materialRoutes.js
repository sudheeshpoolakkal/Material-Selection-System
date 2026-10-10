const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');

// Define routes
router.get('/', materialController.getAllMaterials);
router.get('/summary', materialController.getSummary);
router.get('/categories', materialController.getCategories);
router.get('/applications', materialController.getApplications);
router.get('/search', materialController.searchMaterials);
router.post('/recommend', materialController.getRecommendations);
router.get('/:id', materialController.getMaterialById);


module.exports = router;
