import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Board from '../models/Board.js';
import path from 'path';

import TaskHistory from '../models/TaskHistory.js';
import mongoose from 'mongoose';

// 🔍 Получить задачу по ID
export const getTask = async (req, res) => {
    const task = await Task.findById(req.params.id)
        .populate('assignedTo', '-password')
        .populate('createdBy', '-password');
    if (!task) return res.status(404).json({ message: 'Задача не найдена' });
    res.json(task);
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
            .sort({ createdAt: -1 });

        const transformed = tasks.map(task => ({
            ...task._doc,
            board_name: task.boardId?.name || null,
            project_name: task.projectId?.name || null
        }));

        res.json(transformed);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении задач', error });
    }
};

// ✏️ Обновить задачу (только автор или участник)
export const updateTask = async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Задача не найдена' });

    const userId = req.user.userId;
    const isCreator = task.createdBy.toString() === userId;
    const isAssigned = task.assignedTo.includes(userId);
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';

    if (!isCreator && !isAssigned && !isManager) {
        return res.status(403).json({ message: 'Нет прав редактировать задачу' });
    }

    Object.assign(task, req.body);
    task.updatedAt = new Date();
    await task.save();
    res.json(task);
};

// 🔁 Изменение статуса задачи
export const updateTaskStatus = async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Задача не найдена' });

    const userId = req.user.userId;
    const isCreator = task.createdBy.toString() === userId;
    const isAssigned = task.assignedTo.includes(userId);
    if (!isCreator && !isAssigned) {
        return res.status(403).json({ message: 'Нет прав менять статус задачи' });
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

    res.json({ message: 'Статус обновлён', task });
};

// 🗑 Архивировать задачу
export const archiveTask = async (req, res) => {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Задача не найдена' });

    if (task.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Только автор или админ может архивировать' });
    }

    task.isArchived = true;
    await task.save();
    res.json({ message: 'Задача архивирована' });
};

// 📜 История задачи
export const getTaskHistory = async (req, res) => {
    const history = await TaskHistory.find({ taskId: req.params.id })
        .populate('by', 'fullName role')
        .sort({ timestamp: -1 });
    res.json(history);
};

//create task
export const createTask = async (req, res) => {
    try {
        const { boardId } = req.params;
        const board = await Board.findById(boardId);
        if (!board) return res.status(404).json({ message: 'Доска не найдена' });

        const { title, description, priority, estimatedHours, startDate, dueDate, assignedTo } = req.body;

        const taskImg = req.file ? path.basename(req.file.filename) : null;

        const task = new Task({
            title,
            description,
            priority,
            estimatedHours,
            startDate,
            dueDate,
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

