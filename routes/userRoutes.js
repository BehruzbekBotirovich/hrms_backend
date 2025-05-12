import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import {checkRole} from '../middleware/checkroleMiddleware.js';
import {
    getMe,
    updateMe,
    createUser,
    updateUser,
    deleteUser,
    getUsers,
    getMeTasks, getMyKPI, getAllUsersKPI, reactiveUser
} from '../controllers/userController.js';
import {verifyToken} from '../middleware/authMiddleware.js';

const router = express.Router();

// 📦 Настройка хранилища для аватаров
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatars');
    },
    filename: function (req, file, cb) {
        const hash = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${hash}${ext}`);
    }
});
const upload = multer({storage});

// 👤 CRUD пользователей
router.post('/', verifyToken, checkRole(['admin', 'manager']), upload.single('avatar'), createUser);
router.get('/', verifyToken, getUsers);
router.patch('/:id', verifyToken, checkRole(['admin', 'manager']), updateUser);
router.delete('/:id', verifyToken, checkRole(['admin', 'manager']), deleteUser);
router.get('/kpi', verifyToken, checkRole(['admin', 'manager']), getAllUsersKPI );
router.patch('/reactivate/:id',   verifyToken, checkRole(['admin', 'manager']), reactiveUser);
// 👤 Работа со своим профилем
router.get('/me', verifyToken, getMe);
router.patch('/me', verifyToken, updateMe);
router.get('/me/tasks', verifyToken, getMeTasks);
router.get('/me/kpi', verifyToken, getMyKPI);
export default router;
