import User from '../models/User.js';
import Task from '../models/Task.js';
import {parseISO, format} from 'date-fns';  // Импортируем parseISO и format из date-fns

// 👤 Получить текущего пользователя user/me
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');  // Возвращаем все поля, кроме пароля
        if (!user) return res.status(404).json({message: 'Пользователь не найден'});
        res.json(user);
    } catch (error) {
        res.status(500).json({message: 'Ошибка получения профиля'});
    }
};

// 🔄 Обновить СВОИ данные user/me
export const updateMe = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            {
                ...req.body,  // добавляем новые поля в тело запроса
            },
            {new: true}
        ).select('-password');  // Убираем поле пароля

        if (!updatedUser) return res.status(404).json({message: 'Пользователь не найден'});

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({message: 'Ошибка обновления профиля', error});
        console.log(error);
    }
};

export const getMeTasks = async (req, res) => {
    try {
        const userId = req.user.userId;  // Извлекаем userId из токена

        console.log('userId from token:', userId);  // Логируем userId из токена

        // Получаем все задачи для текущего пользователя (создатель или назначен)
        const tasks = await Task.find({
            $or: [{ createdBy: userId }, { assignedTo: userId }],
            isArchived: false,
        })
            .populate('assignedTo', 'fullName avatarUrl')  // Популяция для участников
            .populate('createdBy', 'fullName')  // Популяция для создателя
            .populate('boardId', 'name')  // Популяция для получения названия доски
            .populate('projectId', 'name')  // Популяция для получения названия проекта
            .sort({ createdAt: -1 });  // Сортировка по дате создания

        if (!tasks || tasks.length === 0) {
            return res.status(404).json({ message: 'Задачи не найдены' });
        }

        // Инициализация объекта для группировки задач по статусам
        const groupedTasks = {
            Created: [],
            InProgress: [],
            Review: [],
            Test: [],
            Done: [],  // Для Merge
        };

        // Форматируем задачи и группируем их по статусу
        tasks.forEach((task) => {
            console.log(`Task status: ${task.status}`);  // Логируем статус каждой задачи

            const status = task.status;
            if (status === 'Merge') {
                groupedTasks.Done.push(task); // Обрабатываем Merge как "Завершено"
            } else if (status === 'Created') {
                groupedTasks.Created.push(task);
            } else if (status === 'InProgress') {
                groupedTasks.InProgress.push(task);
            } else if (status === 'Review') {
                groupedTasks.Review.push(task);
            } else if (status === 'Test') {
                groupedTasks.Test.push(task);
            }
        });

        res.json(groupedTasks);
    } catch (error) {
        console.error('Ошибка при получении задач пользователя:', error);
        res.status(500).json({ message: 'Ошибка при получении задач', error });
    }
};


//=======================================================================================================
// создания пользователя
export const createUser = async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json({message: 'Пользователь создан', user});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Ошибка при создании пользователя', error});
    }
};

// 🔄 Обновить пользователя
export const updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new: true}
        ).select('-password');
        if (!updatedUser) return res.status(404).json({message: 'Пользователь не найден'});
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({message: 'Ошибка обновления пользователя'});
    }
};

// ❌ Удалить (деактивировать) пользователя
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            {isActive: false},
            {new: true}
        );
        if (!user) return res.status(404).json({message: 'Пользователь не найден'});
        res.json({message: 'Пользователь деактивирован'});
    } catch (error) {
        res.status(500).json({message: 'Ошибка удаления пользователя'});
    }
};

// 📃 Получить список пользователей
export const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({message: 'Ошибка получения списка пользователей'});
    }
};

