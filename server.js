import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import boardRoutes from './routes/boardRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import attendeeRoutes from './routes/attendanceRoutes.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use('/user', uploadRoutes);
app.use(cors({
    origin: '*',  // Разрешить доступ с любого источника
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,  // Если нужно работать с cookies
}));

app.get('/api', (req, res) => {
    res.send('Hello world from backend PLANERA MS');
});


app.use('/api/auth', authRoutes); // пример маршрута
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', boardRoutes);
app.use('/api', taskRoutes);
app.use('/api/attendance', attendeeRoutes);
app.use('/api/upload/', uploadRoutes);

const PORT = process.env.PORT || 5000;
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB подключена');
        app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
    })
    .catch((err) => console.error('❌ Ошибка MongoDB:', err));
