import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    getProjects,
    createProject,
    getProjectById,
    updateProject,
    archiveProject,
    getProjectMembers, updateProjectMember
} from '../controllers/projectController.js';
const router = express.Router();



router.get('/', verifyToken, getProjects);
router.post('/', verifyToken, createProject);
router.get('/:id', verifyToken, getProjectById);
router.patch('/:id', verifyToken, updateProject);
router.delete('/:id', verifyToken, archiveProject);
router.get('/:projectId/members', verifyToken, getProjectMembers);
router.patch('/:id/members', verifyToken, updateProjectMember);
// далее добавим getOne, patch, delete

export default router;
