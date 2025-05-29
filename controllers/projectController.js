import Project from '../models/Project.js';
import User from '../models/User.js';
import mongoose from "mongoose";

// 📃 Получить список проектов, где состоит пользователь
export const getProjects = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { isArchived, isActive, search } = req.query; // Получаем параметры фильтрации из query

        // Фильтрация для админов
        let filter = {};

        // Если роль пользователя 'admin', возвращаем все проекты
        if (req.user.role === 'admin') {
            if (isArchived !== undefined) {
                filter.isArchived = isArchived === 'false';
            }

            if (isActive !== undefined) {
                filter.isActive = isActive === 'true';
            }

            if (search) {
                filter.name = { $regex: search, $options: 'i' }; // Поиск по имени проекта
            }
        } else {
            // Для обычных пользователей фильтруем по участникам и создателю
            filter = {
                $or: [{ owner: userId }, { members: userId }],
            };

            // Фильтрация по архивированию
            filter.isArchived = isArchived !== undefined ? isArchived === 'true' : false;

            if (isActive !== undefined) {
                filter.isActive = isActive === 'true';
            }

            // Добавляем фильтрацию по поиску по имени проекта
            if (search) {
                filter.name = { $regex: search, $options: 'i' }; // Поиск по имени
            }
        }

        // Получаем проекты по фильтру
        const projects = await Project.find(filter)
            .populate('owner', 'fullName')  // Заполняем имя создателя проекта
            .populate('members', 'fullName avatarUrl')  // Заполняем имена участников и avatarUrl
            .exec();

        // Преобразуем проекты с добавлением информации о количестве участников
        const transformedProjects = projects.map(project => {
            return {
                _id: project._id,
                isArchived: project.isArchived,
                name: project.name,
                description: project.description,
                owner: project.owner.fullName,  // Имя владельца
                membersCount: project.members.length,  // Количество участников
                members: project.members.map(member => ({
                    fullName: member.fullName,
                    avatarUrl: member.avatarUrl || null,  // Ссылка на аватарку
                }))  // Список участников с аватарками
            };
        });

        res.json(transformedProjects);
    } catch (err) {
        console.error('Ошибка получения проектов:', err);
        res.status(500).json({ message: 'Ошибка получения проектов', err });
    }
};

// ➕ Создать проект
export const createProject = async (req, res) => {
    try {
        const {name, description, members} = req.body;  // Получаем имя, описание и сотрудников (members)

        if (!name || !description || !members || members.length === 0) {
            return res.status(400).json({message: 'Необходимы имя, описание и хотя бы один сотрудник'});
        }
        // Создаем новый проект
        const newProject = new Project({
            name,
            description,
            owner: req.user.userId,  // Создатель проекта - это текущий авторизованный пользователь
            members,  // Добавляем сотрудников (массив ObjectId пользователей)
            isArchived: false
        });

        // Сохраняем проект в базе данных
        await newProject.save();

        res.status(201).json(newProject);  // Отправляем созданный проект
    } catch (err) {
        console.error('Ошибка при добавлении проекта:', err);
        res.status(500).json({message: 'Ошибка при добавлении проекта', err});
    }
};

// 📄 Получить один проект по ID
export const getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('owner members', '-password');
        if (!project) return res.status(404).json({message: 'Проект не найден'});

        // Проверка: имеет ли пользователь доступ?
        const userId = req.user.userId;
        const isMember = project.members.some(member => member._id.toString() === userId);
        const isOwner = project.owner._id.toString() === userId;
        if (!isOwner && !isMember) {
            return res.status(403).json({message: 'Нет доступа к этому проекту'});
        }

        res.json(project);
    } catch (err) {
        res.status(500).json({message: 'Ошибка получения проекта', err});
    }
};

// ✏️ Обновить проект
export const updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({message: 'Проект не найден'});

        // Проверка, является ли пользователь владельцем проекта, менеджером или админом
        const userRole = req.user.role;  // Должно быть в req.user.role, предполагаем, что это поле существует

        // Проверка, если пользователь - не владелец проекта, и не админ/менеджер
        if (project.owner.toString() !== req.user.userId && !['admin', 'manager'].includes(userRole)) {
            return res.status(403).json({message: 'Только владелец, админ или менеджер может обновить проект'});
        }

        // Обновление проекта
        Object.assign(project, req.body);
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({message: 'Ошибка обновления проекта', err});
    }
};

// 🗑 Архивировать проект (мягкое удаление)
export const archiveProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({message: 'Проект не найден'});

        if (project.owner.toString() !== req.user.userId)
            return res.status(403).json({message: 'Только владелец может архивировать проект'});

        project.isArchived = true;
        await project.save();
        res.json({message: 'Проект архивирован'});
    } catch (err) {
        res.status(500).json({message: 'Ошибка при архивировании', err});
    }
};

// get members of project
export const getProjectMembers = async (req, res) => {
    try {
        const {projectId} = req.params;

        // Получаем проект по ID
        const project = await Project.findById(projectId)
            .populate('members', 'fullName email avatarUrl role position department') // Заменили imgHash на avatarUrl
            .exec();

        if (!project) {
            return res.status(404).json({message: 'Проект не найден'});
        }

        // Возвращаем список сотрудников с дополнительными полями
        res.json(project.members);
    } catch (err) {
        console.error('Ошибка при получении сотрудников проекта:', err);
        res.status(500).json({message: 'Ошибка при получении сотрудников проекта', err});
    }
};

export const updateProjectMember = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({message: 'Проект не найден'});

        // Проверка, является ли пользователь владельцем проекта, менеджером или админом
        const userRole = req.user.role;  // Должно быть в req.user.role, предполагаем, что это поле существует
        if (project.owner.toString() !== req.user.userId && !['admin', 'manager'].includes(userRole)) {
            return res.status(403).json({message: 'Только владелец, админ или менеджер может обновить участников проекта'});
        }
        const {action, userIds} = req.body;  // action: 'add' или 'remove', userIds: массив идентификаторов сотрудников

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({message: 'Массив участников должен быть непустым'});
        }

        const userIdsAsString = userIds.map(id => id.toString());
        if (action === 'add') {
            userIdsAsString.forEach(userId => {
                if (!project.members.includes(userId)) {
                    project.members.push(userId);
                }
            });
        } else if (action === 'remove') {
            project.members = project.members.filter(memberId => !userIdsAsString.includes(memberId.toString()));
        } else {
            return res.status(400).json({message: 'Неверный параметр действия. Доступные действия: add, remove'});
        }

        const updatedProject = await project.save();
        res.json(updatedProject);  // Отправляем обновленный проект в ответ
    } catch (err) {
        console.error('Error during participant update:', err);
        res.status(500).json({message: 'Ошибка при обновлении участников проекта', err});
    }
};