// routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getProjects,
    createProject,
    getProjectById,
    updateProject,
    deleteProject,
    addMaterialSpec,
    deleteMaterialSpec,
    addCollaborator,
    removeCollaborator
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

// All project routes require authentication
router.use(protect);

// Dashboard statistics
router.get('/stats', getDashboardStats);

// Project collections
router.get('/', getProjects);
router.post('/', createProject);

// Single project operations
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Material specs sub-resources
router.post('/:id/specs', addMaterialSpec);
router.delete('/:id/specs/:specId', deleteMaterialSpec);

// Collaborator sub-resources
router.post('/:id/collaborators', addCollaborator);
router.delete('/:id/collaborators/:targetUserId', removeCollaborator);

module.exports = router;
