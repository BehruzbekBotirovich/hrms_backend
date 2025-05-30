import Task from '../models/Task.js';
import Project from '../models/Project.js';
import TaskHistory from '../models/TaskHistory.js';
import Board from '../models/Board.js';
import User from '../models/User.js';
import path from 'path';
import {format} from 'date-fns';  // Вы можете использовать date-fns для работы с датами

import mongoose from 'mongoose';
import {notifyTaskCreated, sendTelegramMessage} from '../utils/telegramBot.js';  // Подключаем файл с функциями

// 🔍 Получить задачу по ID
export const getTask = async (req, res) => {
    try {
        // Получаем задачу по ID
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', '-password')  // Популяция для участников
            .populate('createdBy', '-password'); // Популяция для создателя

        if (!task) {
            return res.status(404).json({message: 'Задача не найдена'});
        }

        // Получаем историю этой задачи, сортируем по timestamp (дате)
        const history = await TaskHistory.find({taskId: task._id})
            .populate('by', 'fullName role')  // Получаем данные об актерах
            .sort({timestamp: 1});  // Сортируем по времени (от старого к новому)

        // Формируем историю с добавлением изменений статуса
        const updatedHistory = history.map(item => ({
            ...item._doc,
            statusChange: {
                fromStatus: item.fromStatus,
                toStatus: item.toStatus,
            }
        }));

        // Формируем ответ с полями даты и историей
        const taskData = {
            ...task._doc,
            startDate: task.startDate,
            dueDate: task.dueDate,
            history: updatedHistory
        };

        res.json(taskData);
    } catch (error) {
        console.error('Ошибка при получении задачи:', error);
        res.status(500).json({message: 'Ошибка при получении задачи', error});
    }
};

// 📃 Получить все задачи (с фильтрами или без)
export const getAllTasks = async (req, res) => {
    try {
        const filter = {};

        if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.projectId) filter.projectId = req.query.projectId;
        if (req.query.boardId) filter.boardId = req.query.boardId;

        filter.isArchived = false;

        const tasks = await Task.find(filter)
            .populate('assignedTo', 'fullName')
            .populate('createdBy', 'fullName')
            .populate('boardId', 'name')    // ✅ правильно
            .populate('projectId', 'name')  // ✅ правильно
            .sort({createdAt: -1});

        const transformed = tasks.map(task => ({
            ...task._doc,
            board_name: task.boardId?.name || null,
            project_name: task.projectId?.name || null
        }));

        res.json(transformed);
    } catch (error) {
        res.status(500).json({message: 'Ошибка при получении задач', error});
    }
};

// ✏️ Обновить задачу (только автор или участник)
// ✏️ Обновить задачу (только автор или участник, админ может любые изменения)
export const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({message: 'Задача не найдена'});

        const userId = req.user.userId;
        const isCreator = task.createdBy.toString() === userId;
        const isAssigned = task.assignedTo.includes(userId);
        const isManager = req.user.role === 'manager' || req.user.role === 'admin';

        if (!isCreator && !isAssigned && !isManager) {
            return res.status(403).json({message: 'Нет прав редактировать задачу'});
        }

        // Изменение полей задачи, кроме статуса
        const {title, description, priority, estimatedHours, startDate, dueDate, assignedTo} = req.body;

        let taskImg = task.taskImg;  // Сохраняем старое изображение, если оно есть
        if (req.file) {
            taskImg = path.basename(req.file.filename);
        }

        const updateData = {
            title,
            description,
            priority,
            estimatedHours: estimatedHours !== undefined ? estimatedHours : task.estimatedHours,
            startDate: startDate || task.startDate,
            dueDate: dueDate || task.dueDate,
            assignedTo: assignedTo || task.assignedTo,
            taskImg,
            updatedAt: new Date(),
        };

        // Обновляем задачу
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            updateData,
            {new: true}
        ).populate('assignedTo', 'fullName avatarUrl')
            .populate('createdBy', 'fullName');

        // Формируем уведомление для Telegram
        const message = `
        📌 Задача "${updatedTask.title}" была обновлена:
        
        <b>Изменения:</b>
        📝 Описание: ${updatedTask.description || 'Не указано'}
        📅 Дедлайн: ${updatedTask.dueDate ? updatedTask.dueDate.toLocaleDateString() : 'Не указан'}
        🚀 Назначенные: ${updatedTask.assignedTo.map(user => user.fullName).join(', ')}

        Создатель: ${updatedTask.createdBy.fullName}
        🗓 Дата изменения: ${format(new Date(updatedTask.updatedAt), 'MMM dd, yyyy, HH:mm')}
        `;

        // Получаем chatIds для создателя и назначенных участников
        const chatIds = new Set([updatedTask.createdBy.chatId]);
        updatedTask.assignedTo.forEach(user => {
            if (user.chatId) chatIds.add(user.chatId);
        });

        // Отправляем сообщение всем получателям
        for (const chatId of chatIds) {
            await sendTelegramMessage(chatId, message);
        }

        res.json(updatedTask);
    } catch (error) {
        console.error('Ошибка при обновлении задачи:', error);
        res.status(500).json({message: 'Ошибка при обновлении задачи', error});
    }
};

// 🔁 Изменение статуса задачи (с уведомлением в Telegram)
export const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({message: 'Задача не найдена'});

        const userId = req.user.userId;
        const isCreator = task.createdBy.toString() === userId;
        const isAssigned = task.assignedTo.includes(userId);
        const isManager = req.user.role === 'manager' || req.user.role === 'admin';

        if (!isCreator && !isAssigned && !isManager) {
            return res.status(403).json({message: 'Нет прав менять статус задачи'});
        }

        const fromStatus = task.status;
        const toStatus = req.body.status;

        task.status = toStatus;
        task.updatedAt = new Date();
        task.statusUpdatedAt = new Date(); // Устанавливаем вручную

        // История
        await TaskHistory.create({
            taskId: task._id,
            action: 'Status changed',
            fromStatus,
            toStatus,
            by: userId
        });

        await task.save();

        // Формируем уведомление для Telegram
        const message = `
        📌 Статус задачи "${task.title}" изменен:

        🔑 Старый статус: ${fromStatus}
        🔄 Новый статус: ${toStatus}

        Создатель: ${task.createdBy.fullName}
        🗓 Дата изменения: ${format(new Date(task.updatedAt), 'MMM dd, yyyy, HH:mm')}
        `;

        // Получаем chatIds для создателя и назначенных участников
        const chatIds = new Set([task.createdBy.chatId]);
        task.assignedTo.forEach(user => {
            if (user.chatId) chatIds.add(user.chatId);
        });

        // Отправляем сообщение всем получателям
        for (const chatId of chatIds) {
            await sendTelegramMessage(chatId, message);
        }

        res.json({message: 'Статус задачи успешно обновлен и уведомления отправлены.'});
    } catch (error) {
        console.error('Ошибка при изменении статуса задачи:', error);
        res.status(500).json({message: 'Ошибка при изменении статуса задачи', error});
    }
};

// 🗑 Архивировать задачу
export const archiveTask = async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({message: 'Задача не найдена'});

    if (task.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({message: 'Только автор или админ может архивировать'});
    }

    task.isArchived = true;
    await task.save();
    res.json({message: 'Задача архивирована'});
};

// 📜 История задачи
export const getTaskHistory = async (req, res) => {
    const history = await TaskHistory.find({taskId: req.params.id})
        .populate('by', 'fullName role')
        .sort({timestamp: -1});
    res.json(history);
};

// createTask
export const createTask = async (req, res) => {
    try {
        const {boardId} = req.params;
        const board = await Board.findById(boardId);
        if (!board) return res.status(404).json({message: 'Доска не найдена'});

        const {title, description, priority, estimatedHours, startDate, dueDate, assignedTo, status} = req.body;

        // Проверка поля title на обязательность
        if (!title || title.trim() === '') {
            return res.status(400).json({message: 'Заголовок задачи обязателен'});
        }

        // Проверка на правильность значения priority
        const validPriorities = ['Low', 'Normal', 'Medium', 'High', 'Urgent'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({message: 'Неверное значение для поля priority'});
        }

        // Проверка на правильность типа для estimatedHours
        let estimatedHoursValue = estimatedHours !== undefined ? (estimatedHours === null ? null : Number(estimatedHours)) : null;
        if (estimatedHoursValue !== null && isNaN(estimatedHoursValue)) {
            return res.status(400).json({message: 'Поле estimatedHours должно быть числом'});
        }

        // Преобразуем строки в даты, если они есть
        const startDateParsed = startDate ? new Date(startDate) : null;
        const dueDateParsed = dueDate ? new Date(dueDate) : null;

        if (isNaN(startDateParsed)) {
            return res.status(400).json({message: 'Неверный формат даты начала'});
        }

        if (isNaN(dueDateParsed)) {
            return res.status(400).json({message: 'Неверный формат даты окончания'});
        }

        const taskImg = req.file ? path.basename(req.file.filename) : null;
        const task = new Task({
            title,
            description,
            priority,
            estimatedHours: estimatedHoursValue,
            startDate: startDateParsed,
            dueDate: dueDateParsed,
            status,
            assignedTo,
            createdBy: req.user.userId,
            projectId: board.projectId,
            boardId,
            taskImg
        });

        await task.save();

        // Отправляем уведомление в Telegram
        await notifyTaskCreated(task);

        res.status(201).json(task);
    } catch (error) {
        console.error('Ошибка при создании задачи:', error);
        res.status(500).json({message: 'Ошибка при создании задачи', error});
    }
};


