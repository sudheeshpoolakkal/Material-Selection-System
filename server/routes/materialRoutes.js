const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');

// Define routes
router.get('/', materialController.getAllMaterials);
router.get('/categories', materialController.getCategories);
router.get('/applications', materialController.getApplications);
router.get('/search', materialController.searchMaterials);
router.get('/:id', materialController.getMaterialById);
router.post('/:id/ratings', materialController.addMaterialRating);

module.exports = router;
