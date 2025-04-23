import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

// Настройка хранилища
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

const upload = multer({ storage });

// 📤 Загрузка аватарки
router.post('/upload-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'Файл не загружен' });

        const newHash = path.basename(file.filename);
        const user = await User.findById(req.user.userId);

        // Удалить старый файл, если был
        if (user.avatarUrl) {
            const oldPath = path.join('uploads/avatars', user.avatarUrl);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Обновить в базе
        user.avatarUrl = newHash;
        await user.save();

        res.json({ message: 'Аватарка обновлена', imgHash: newHash });

    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении аватара', error });
    }
});

// 🖼 Получение аватарки
router.get('/avatar/:imgHash', (req, res) => {
    const filePath = path.join('uploads/avatars', req.params.imgHash);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) return res.status(404).json({ message: 'Изображение не найдено' });
        res.sendFile(path.resolve(filePath));
    });
});

export default router;
