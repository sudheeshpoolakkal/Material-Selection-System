// controllers/projectController.js
const db = require('../config/db');

// Helper to check user access to a project
const checkProjectAccess = async (projectId, userId) => {
    const [projects] = await db.execute(
        'SELECT * FROM Projects WHERE project_id = ?',
        [projectId]
    );
    if (projects.length === 0) return null;

    const project = projects[0];
    if (project.owner_id === userId) {
        return { project, role: 'owner', canWrite: true };
    }

    const [collabs] = await db.execute(
        'SELECT * FROM Collaborators WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
    );
    if (collabs.length > 0) {
        const perm = collabs[0].permission_level;
        return { project, role: perm, canWrite: perm === 'write' || perm === 'admin' };
    }

    return null;
};

// @desc    Get dashboard statistics for current user
// @route   GET /api/projects/stats
// @access  Private
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Accessible projects count
        const [projectRows] = await db.execute(
            `SELECT p.project_id, p.owner_id 
             FROM Projects p 
             LEFT JOIN Collaborators c ON p.project_id = c.project_id 
             WHERE p.owner_id = ? OR c.user_id = ?
             GROUP BY p.project_id`,
            [userId, userId]
        );

        const projectIds = projectRows.map(r => r.project_id);
        const totalProjects = projectRows.length;
        const ownedProjects = projectRows.filter(r => r.owner_id === userId).length;

        // Collaborations count
        const [collabRows] = await db.execute(
            'SELECT COUNT(*) as count FROM Collaborators WHERE user_id = ?',
            [userId]
        );
        const collaborations = collabRows[0].count;

        // Material specs count across accessible projects
        let totalSpecs = 0;
        if (projectIds.length > 0) {
            const placeholders = projectIds.map(() => '?').join(',');
            const [specRows] = await db.execute(
                `SELECT COUNT(*) as count FROM Material_Specs WHERE project_id IN (${placeholders})`,
                projectIds
            );
            totalSpecs = specRows[0].count;
        }

        res.json({
            totalProjects,
            ownedProjects,
            collaborations,
            totalSpecs
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Server error retrieving statistics.' });
    }
};

// @desc    Get all accessible projects for user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
    try {
        const userId = req.user.id;

        const [projects] = await db.execute(
            `SELECT 
                p.project_id,
                p.name,
                p.owner_id,
                p.created_at,
                u.name as owner_name,
                u.email as owner_email,
                (SELECT COUNT(*) FROM Material_Specs ms WHERE ms.project_id = p.project_id) as specs_count,
                (SELECT COUNT(*) FROM Collaborators c WHERE c.project_id = p.project_id) as collaborators_count,
                (CASE WHEN p.owner_id = ? THEN 'owner' 
                      ELSE (SELECT permission_level FROM Collaborators c2 WHERE c2.project_id = p.project_id AND c2.user_id = ?) 
                 END) as user_role
             FROM Projects p
             JOIN Users u ON p.owner_id = u.user_id
             LEFT JOIN Collaborators col ON p.project_id = col.project_id
             WHERE p.owner_id = ? OR col.user_id = ?
             GROUP BY p.project_id
             ORDER BY p.created_at DESC`,
            [userId, userId, userId, userId]
        );

        res.json(projects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ message: 'Server error retrieving projects.' });
    }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
    try {
        const { name, max_weight, target_cost } = req.body;
        const userId = req.user.id;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Project name is required.' });
        }

        const [result] = await db.execute(
            'INSERT INTO Projects (name, owner_id) VALUES (?, ?)',
            [name.trim(), userId]
        );

        const projectId = result.insertId;

        // If initial specs provided, create them
        if (max_weight !== undefined && target_cost !== undefined && max_weight !== '' && target_cost !== '') {
            const weightVal = parseFloat(max_weight);
            const costVal = parseFloat(target_cost);
            if (!isNaN(weightVal) && !isNaN(costVal)) {
                await db.execute(
                    'INSERT INTO Material_Specs (project_id, max_weight, target_cost) VALUES (?, ?, ?)',
                    [projectId, weightVal, costVal]
                );
            }
        }

        res.status(201).json({
            project_id: projectId,
            name: name.trim(),
            owner_id: userId,
            message: 'Project created successfully.'
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ message: 'Server error creating project.' });
    }
};

// @desc    Get single project with specs and collaborators
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;

        const access = await checkProjectAccess(projectId, userId);
        if (!access) {
            return res.status(404).json({ message: 'Project not found or unauthorized access.' });
        }

        // Fetch specs
        const [specs] = await db.execute(
            'SELECT spec_id, project_id, max_weight, target_cost, created_at FROM Material_Specs WHERE project_id = ? ORDER BY created_at DESC',
            [projectId]
        );

        // Fetch collaborators
        const [collaborators] = await db.execute(
            `SELECT c.user_id, u.name, u.email, c.permission_level 
             FROM Collaborators c 
             JOIN Users u ON c.user_id = u.user_id 
             WHERE c.project_id = ?`,
            [projectId]
        );

        res.json({
            ...access.project,
            user_role: access.role,
            can_write: access.canWrite,
            specs,
            collaborators
        });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ message: 'Server error fetching project.' });
    }
};

// @desc    Update project name
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Project name is required.' });
        }

        const access = await checkProjectAccess(projectId, userId);
        if (!access || !access.canWrite) {
            return res.status(403).json({ message: 'Unauthorized: write permission required.' });
        }

        await db.execute('UPDATE Projects SET name = ? WHERE project_id = ?', [name.trim(), projectId]);

        res.json({ message: 'Project updated successfully.' });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ message: 'Server error updating project.' });
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;

        const access = await checkProjectAccess(projectId, userId);
        if (!access || access.role !== 'owner') {
            return res.status(403).json({ message: 'Only the project owner can delete this project.' });
        }

        await db.execute('DELETE FROM Projects WHERE project_id = ?', [projectId]);

        res.json({ message: 'Project deleted successfully.' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ message: 'Server error deleting project.' });
    }
};

// @desc    Add material spec to project
// @route   POST /api/projects/:id/specs
// @access  Private
const addMaterialSpec = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        const { max_weight, target_cost } = req.body;

        const weight = parseFloat(max_weight);
        const cost = parseFloat(target_cost);

        if (isNaN(weight) || isNaN(cost) || weight <= 0 || cost <= 0) {
            return res.status(400).json({ message: 'Valid positive numbers for max weight and target cost are required.' });
        }

        const access = await checkProjectAccess(projectId, userId);
        if (!access || !access.canWrite) {
            return res.status(403).json({ message: 'Unauthorized: write permission required.' });
        }

        const [result] = await db.execute(
            'INSERT INTO Material_Specs (project_id, max_weight, target_cost) VALUES (?, ?, ?)',
            [projectId, weight, cost]
        );

        res.status(201).json({
            spec_id: result.insertId,
            project_id: projectId,
            max_weight: weight,
            target_cost: cost,
            message: 'Material spec added successfully.'
        });
    } catch (error) {
        console.error('Add spec error:', error);
        res.status(500).json({ message: 'Server error adding material spec.' });
    }
};

// @desc    Delete material spec
// @route   DELETE /api/projects/:id/specs/:specId
// @access  Private
const deleteMaterialSpec = async (req, res) => {
    try {
        const { id: projectId, specId } = req.params;
        const userId = req.user.id;

        const access = await checkProjectAccess(projectId, userId);
        if (!access || !access.canWrite) {
            return res.status(403).json({ message: 'Unauthorized: write permission required.' });
        }

        await db.execute(
            'DELETE FROM Material_Specs WHERE spec_id = ? AND project_id = ?',
            [specId, projectId]
        );

        res.json({ message: 'Material spec removed.' });
    } catch (error) {
        console.error('Delete spec error:', error);
        res.status(500).json({ message: 'Server error deleting material spec.' });
    }
};

// @desc    Add collaborator to project
// @route   POST /api/projects/:id/collaborators
// @access  Private
const addCollaborator = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.id;
        const { email, permission_level } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'User email is required.' });
        }

        const access = await checkProjectAccess(projectId, userId);
        if (!access || access.role !== 'owner') {
            return res.status(403).json({ message: 'Only the project owner can manage collaborators.' });
        }

        const [users] = await db.execute('SELECT user_id, name, email FROM Users WHERE email = ?', [email.trim()]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'No registered user found with that email.' });
        }

        const targetUser = users[0];
        if (targetUser.user_id === userId) {
            return res.status(400).json({ message: 'You are already the owner of this project.' });
        }

        const validPerms = ['read', 'write', 'admin'];
        const perm = validPerms.includes(permission_level) ? permission_level : 'read';

        // Check if already added
        const [existing] = await db.execute(
            'SELECT * FROM Collaborators WHERE project_id = ? AND user_id = ?',
            [projectId, targetUser.user_id]
        );

        if (existing.length > 0) {
            // Update permission
            await db.execute(
                'UPDATE Collaborators SET permission_level = ? WHERE project_id = ? AND user_id = ?',
                [perm, projectId, targetUser.user_id]
            );
            return res.json({ message: 'Collaborator permission updated.' });
        }

        await db.execute(
            'INSERT INTO Collaborators (project_id, user_id, permission_level) VALUES (?, ?, ?)',
            [projectId, targetUser.user_id, perm]
        );

        res.status(201).json({
            message: 'Collaborator added successfully.',
            collaborator: {
                user_id: targetUser.user_id,
                name: targetUser.name,
                email: targetUser.email,
                permission_level: perm
            }
        });
    } catch (error) {
        console.error('Add collaborator error:', error);
        res.status(500).json({ message: 'Server error adding collaborator.' });
    }
};

// @desc    Remove collaborator
// @route   DELETE /api/projects/:id/collaborators/:targetUserId
// @access  Private
const removeCollaborator = async (req, res) => {
    try {
        const { id: projectId, targetUserId } = req.params;
        const userId = req.user.id;

        const access = await checkProjectAccess(projectId, userId);
        if (!access || access.role !== 'owner') {
            return res.status(403).json({ message: 'Only the project owner can remove collaborators.' });
        }

        await db.execute(
            'DELETE FROM Collaborators WHERE project_id = ? AND user_id = ?',
            [projectId, targetUserId]
        );

        res.json({ message: 'Collaborator removed.' });
    } catch (error) {
        console.error('Remove collaborator error:', error);
        res.status(500).json({ message: 'Server error removing collaborator.' });
    }
};

module.exports = {
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
};
