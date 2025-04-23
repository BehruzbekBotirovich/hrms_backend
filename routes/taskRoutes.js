import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { verifyToken } from '../middleware/authMiddleware.js';

import { createTask,
    getAllTasks,
    getTask,
    updateTask,
    updateTaskStatus,
    archiveTask,
    getTaskHistory,
} from '../controllers/taskController.js';



const router = express.Router();

// Хранилище изображений
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/tasks');
    },
    filename: function (req, file, cb) {
        const hash = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${hash}${ext}`);
    }
});

const upload = multer({ storage });

router.get('/tasks', verifyToken, getAllTasks);

router.post('/boards/:boardId/tasks', verifyToken, upload.single('taskImg'), createTask);
router.get('/tasks/:id', verifyToken, getTask);
router.patch('/tasks/:id', verifyToken, updateTask);
router.patch('/tasks/:id/status', verifyToken, updateTaskStatus);
router.delete('/tasks/:id', verifyToken, archiveTask);
router.get('/tasks/:id/history', verifyToken, getTaskHistory);

export default router;
