import Task from '../models/Task.js';
import Project from '../models/Project.js';
import TaskHistory from '../models/TaskHistory.js';
import Board from '../models/Board.js';
import path from 'path';
import mongoose from 'mongoose';

// 🔍 Получить задачу по ID
export const getTask = async (req, res) => {
    try {
        // Получаем задачу по ID
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', '-password')  // Популяция для участников
            .populate('createdBy', '-password'); // Популяция для создателя

        if (!task) {
            return res.status(404).json({ message: 'Задача не найдена' });
        }

        // Получаем историю этой задачи, сортируем по timestamp (дате)
        const history = await TaskHistory.find({ taskId: task._id })
            .populate('by', 'fullName role')  // Получаем данные об актерах
            .sort({ timestamp: 1 });  // Сортируем по времени (от старого к новому)

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
        res.status(500).json({ message: 'Ошибка при получении задачи', error });
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
export const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Задача не найдена' });

        const userId = req.user.userId;
        const isCreator = task.createdBy.toString() === userId;
        const isAssigned = task.assignedTo.includes(userId);
        const isManager = req.user.role === 'manager' || req.user.role === 'admin';

        if (!isCreator && !isAssigned && !isManager) {
            return res.status(403).json({ message: 'Нет прав редактировать задачу' });
        }

        // Изменение полей задачи, кроме статуса
        const { title, description, priority, estimatedHours, startDate, dueDate, assignedTo } = req.body;

        // Если есть новое изображение, обновляем его (не добавляем к старому, а заменяем)
        let taskImg = task.taskImg;  // Сохраняем старое изображение, если оно есть
        if (req.file) {
            // Если в запросе передано новое изображение, обновляем путь
            taskImg = path.basename(req.file.filename);
        }

        // Преобразуем поля для обновления:
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
            { new: true }  // возвращаем обновленный объект
        ).populate('assignedTo', 'fullName avatarUrl')  // Популяция для участников
            .populate('createdBy', 'fullName'); // Популяция для создателя

        res.json(updatedTask);

    } catch (error) {
        console.error('Ошибка при обновлении задачи:', error);
        res.status(500).json({ message: 'Ошибка при обновлении задачи', error });
    }
};

// 🔁 Изменение статуса задачи
export const updateTaskStatus = async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({message: 'Задача не найдена'});

    const userId = req.user.userId;
    const isCreator = task.createdBy.toString() === userId;
    const isAssigned = task.assignedTo.includes(userId);
    if (!isCreator && !isAssigned) {
        return res.status(403).json({message: 'Нет прав менять статус задачи'});
    }

    const fromStatus = task.status;
    const toStatus = req.body.status;
    task.status = toStatus;
    task.updatedAt = new Date();
    await task.save();

    await TaskHistory.create({
        taskId: task._id,
        action: 'Status changed',
        fromStatus,
        toStatus,
        by: userId
    });

    res.json({message: 'Статус обновлён', task});
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

//create task
export const createTask = async (req, res) => {
    try {
        const { boardId } = req.params;
        const board = await Board.findById(boardId);
        if (!board) return res.status(404).json({ message: 'Доска не найдена' });

        const { title, description, priority, estimatedHours, startDate, dueDate, assignedTo, status } = req.body;

        // Проверка поля title на обязательность
        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Заголовок задачи обязателен' });
        }

        // Проверка на правильность значения priority
        const validPriorities = ['Low', 'Normal', 'Medium', 'High', 'Urgent'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({ message: 'Неверное значение для поля priority' });
        }

        // Проверка на правильность типа для estimatedHours
        let estimatedHoursValue = estimatedHours !== undefined ? (estimatedHours === null ? null : Number(estimatedHours)) : null;
        if (estimatedHoursValue !== null && isNaN(estimatedHoursValue)) {
            return res.status(400).json({ message: 'Поле estimatedHours должно быть числом' });
        }
        const taskImg = req.file ? path.basename(req.file.filename) : null;
        const task = new Task({
            title,
            description,
            priority,
            estimatedHours: estimatedHoursValue,  // Здесь сохраняем null или число
            startDate,
            dueDate,
            status,
            assignedTo,
            createdBy: req.user.userId,
            projectId: board.projectId,
            boardId,
            taskImg
        });

        await task.save();
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании задачи', error });
    }
};