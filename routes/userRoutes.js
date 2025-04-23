import express from 'express';

import {
    getMe,
    updateMe,
    createUser,
    updateUser,
    deleteUser,
    getUsers
} from '../controllers/userController.js';
import {verifyToken} from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, createUser);
router.get('/', verifyToken, getUsers);
router.patch('/:id', verifyToken, updateUser);
router.delete('/:id', verifyToken, deleteUser);
//user/me
router.get('/me', verifyToken, getMe);
router.patch('/me', verifyToken, updateMe);

export default router;
