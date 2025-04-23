import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { createBoard, getProjectBoards } from '../controllers/boardController.js';
import { updateBoard, archiveBoard} from '../controllers/boardController.js';
import { getBoardTasksByFixedStatuses } from '../controllers/boardController.js';




const router = express.Router();
router.get('/projects/:projectId/boards', verifyToken, getProjectBoards);
router.post('/projects/:projectId/boards', verifyToken, createBoard);
router.patch('/boards/:id', verifyToken, updateBoard);
router.delete('/boards/:id', verifyToken, archiveBoard);

router.get('/boards/:boardId', verifyToken, getBoardTasksByFixedStatuses);


export default router;
