import Board from '../models/Board.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

// 📥 Создать доску внутри проекта
export const createBoard = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: 'Проект не найден' });

        // Проверка: пользователь участник проекта?
        const userId = req.user.userId;
        const isAllowed = project.members.includes(userId) || project.owner.toString() === userId;
        if (!isAllowed) return res.status(403).json({ message: 'Нет доступа к проекту' });

        const board = new Board({
            ...req.body,
            projectId,
            createdBy: userId,
            members: [userId]
        });

        await board.save();
        res.status(201).json(board);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании доски', error });
    }
};

// for page by board
export const getBoardTasksByFixedStatuses = async (req, res) => {
    try {
        const { boardId } = req.params;

        const tasks = await Task.find({ boardId, isArchived: false })
            .populate('assignedTo', 'fullName avatarUrl')
            .populate('createdBy', 'fullName')
            .sort({ createdAt: -1 });

        // Инициализируем объект с пустыми статусами
        const grouped = {
            Created: [],
            'In Progress': [],
            Review: [],
            Test: [],
            Merge: []
        };

        for (const task of tasks) {
            const status = task.status?.trim();
            if (grouped[status]) {
                grouped[status].push(task);
            }
        }

        res.json(grouped);
    } catch (error) {
        console.error('Ошибка при получении задач по boardId:', error);
        res.status(500).json({ message: 'Ошибка при получении задач', error });
    }
};

// 📃 Получить доски проекта  search
export const getProjectBoards = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Получаем все доски для проекта
        const boards = await Board.find({ projectId, isArchived: false })
            .populate('createdBy', 'fullName')  // Добавляем имя создателя доски
            .populate('members', 'fullName')    // Добавляем имена участников
            .exec();

        const boardsWithTaskCount = [];

        for (const board of boards) {
            // Считаем количество задач на доске
            const taskCount = await Task.countDocuments({ boardId: board._id });

            // Добавляем информацию о доске и количестве задач
            boardsWithTaskCount.push({
                _id: board._id,
                name: board.name,
                description: board.description,
                createdBy: board.createdBy?.fullName || null,
                membersCount: board.members.length,
                taskCount,  // Количество задач на доске
            });
        }

        res.json(boardsWithTaskCount);  // Возвращаем данные
    } catch (err) {
        console.error('Ошибка при получении досок проекта:', err);
        res.status(500).json({ message: 'Ошибка при получении досок проекта', err });
    }
};

// ✏️ Обновить доску
export const updateBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json({ message: 'Доска не найдена' });

        // Проверка: только создатель или участник
        const userId = req.user.userId;
        const isOwner = board.createdBy.toString() === userId;
        const isMember = board.members.includes(userId);
        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Нет доступа к редактированию доски' });
        }

        Object.assign(board, req.body);
        await board.save();

        res.json({ message: 'Доска обновлена', board });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении', error });
    }
};

// 🗑 Архивировать доску
export const archiveBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json({ message: 'Доска не найдена' });

        const userId = req.user.userId;
        if (board.createdBy.toString() !== userId) {
            return res.status(403).json({ message: 'Только создатель может архивировать доску' });
        }

        board.isArchived = true;
        await board.save();

        res.json({ message: 'Доска архивирована' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при архивировании', error });
    }
};
