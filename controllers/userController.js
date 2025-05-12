import User from '../models/User.js';
import Task from '../models/Task.js';
import path from 'path';
import {parseISO, format} from 'date-fns';  // Импортируем parseISO и format из date-fns
import {
    startOfMonth, endOfMonth, setMonth, setYear,
} from 'date-fns';
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


export const getMyKPI = async (req, res) => {
    try {
        const userId = req.user.userId;
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const completedTasks = await Task.find({
            assignedTo: userId,
            status: {$in: ['Done', 'Merge']},
            completedAt: {$gte: monthStart, $lte: monthEnd},
            isArchived: false
        });

        const completedTime = completedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

        const assignedTasks = await Task.find({
            assignedTo: userId, isArchived: false, createdAt: {$gte: monthStart, $lte: monthEnd}
        });

        const totalAssignedTime = assignedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

        const unassignedCount = await Task.countDocuments({
            assignedTo: null, isArchived: false, createdAt: {$gte: monthStart, $lte: monthEnd}
        });

        res.json({
            completedTime, totalAssignedTime, unassignedCount
        });

    } catch (error) {
        res.status(500).json({message: 'Ошибка при расчёте KPI', error});
    }
};


// 🔄 Обновить СВОИ данные user/me
export const updateMe = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.user.userId, {
            ...req.body,  // добавляем новые поля в тело запроса
        }, {new: true}).select('-password');  // Убираем поле пароля

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
            $or: [{createdBy: userId}, {assignedTo: userId}], isArchived: false,
        })
            .populate('assignedTo', 'fullName avatarUrl')  // Популяция для участников
            .populate('createdBy', 'fullName')  // Популяция для создателя
            .populate('boardId', 'name')  // Популяция для получения названия доски
            .populate('projectId', 'name')  // Популяция для получения названия проекта
            .sort({createdAt: -1});  // Сортировка по дате создания

        if (!tasks || tasks.length === 0) {
            return res.status(404).json({message: 'Задачи не найдены'});
        }

        // Инициализация объекта для группировки задач по статусам
        const groupedTasks = {
            Created: [], InProgress: [], Review: [], Test: [], Done: [],  // Для Merge
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
        res.status(500).json({message: 'Ошибка при получении задач', error});
    }
};

//=======================================================================================================
// создания пользователя
export const createUser = async (req, res) => {
    try {
        const { fullName, email, password, role, chatId, phone, department } = req.body;
        const creatorRole = req.user.role;

        // manager не может создавать admin'ов
        if (creatorRole === 'manager' && role === 'admin') {
            return res.status(403).json({message: 'Менеджер не может создавать админов'});
        }

        // employee не может создавать вообще
        if (creatorRole === 'employee') {
            return res.status(403).json({message: 'Сотрудник не может создавать пользователей'});
        }

        // Загрузка аватара
        let avatarUrl = null;
        if (req.file) {
            avatarUrl = path.basename(req.file.filename);
        }
        const newUser = new User({
            fullName,
            email,
            password,
            role,
            avatarUrl,
            chatId,
            phone,
            department
        });

        await newUser.save();
        res.status(201).json({message: 'Пользователь создан', user: newUser});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Ошибка при создании пользователя', error});
    }
};

// 🔄 Обновить пользователя
export const updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {new: true}).select('-password');
        if (!updatedUser) return res.status(404).json({message: 'Пользователь не найден'});
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({message: 'Ошибка обновления пользователя'});
    }
};

// ❌ Удалить (деактивировать) пользователя
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, {isActive: false}, {new: true});
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

// ♻️ Восстановить пользователя (isActive: true)
export const reactiveUser = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        if (user.isActive) {
            return res.status(400).json({ message: 'Пользователь уже активен' });
        }

        user.isActive = true;
        await user.save();

        res.json({ message: 'Пользователь успешно восстановлен', user });
    } catch (error) {
        console.error('Ошибка при восстановлении пользователя:', error);
        res.status(500).json({ message: 'Ошибка при восстановлении пользователя', error });
    }
};


export const getAllUsersKPI = async (req, res) => {
    try {
        const monthParam = parseInt(req.query.month);
        const yearParam = parseInt(req.query.year);

        if (isNaN(monthParam) || monthParam < 1 || monthParam > 12) {
            return res.status(400).json({message: 'Неверный параметр месяца (1-12)'});
        }

        if (isNaN(yearParam) || yearParam < 2000 || yearParam > 2100) {
            return res.status(400).json({message: 'Неверный параметр года (например, 2024)'});
        }

        const month = monthParam - 1; // JS месяцы от 0
        const year = yearParam;

        const baseDate = new Date();
        const targetMonth = setMonth(setYear(baseDate, year), month);
        const monthStart = startOfMonth(targetMonth);
        const monthEnd = endOfMonth(targetMonth);

        const users = await User.find({isActive: true});

        const results = [];

        for (const user of users) {
            const userId = user._id;

            const assignedTasks = await Task.find({
                assignedTo: {$in: [userId]}, isArchived: false, statusUpdatedAt: {$gte: monthStart, $lte: monthEnd}
            });

            const completedTasks = assignedTasks.filter(task => ['Review', 'Test', 'Merge'].includes(task.status)
                // Если используешь completedAt:
                // && task.completedAt >= monthStart && task.completedAt <= monthEnd
            );

            const completedTime = completedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
            const totalAssignedTime = assignedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

            results.push({
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    department: user.department,
                    avatarUrl: user.avatarUrl || null
                },
                assignedCount: assignedTasks.length,
                completedCount: completedTasks.length,
                completedTime,
                totalAssignedTime
            });
        }

        res.json(results);
    } catch (error) {
        console.error('Ошибка KPI:', error);
        res.status(500).json({message: 'Ошибка при расчёте KPI', error});
    }
};
