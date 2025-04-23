import Project from '../models/Project.js';
import User from '../models/User.js';

// 📃 Получить список проектов, где состоит пользователь
export const getProjects = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Найдем проекты, где текущий пользователь является владельцем или участником
        const projects = await Project.find({
            $or: [{ owner: userId }, { members: userId }],
            isArchived: false
        })
            .populate('owner', 'fullName')  // Заполняем имя создателя проекта
            .populate('members', 'fullName')  // Заполняем имена участников
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
                membersNames: project.members.map(member => member.fullName)  // Список имен участников
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
        const { name, description, members } = req.body;  // Получаем имя, описание и сотрудников (members)

        if (!name || !description || !members || members.length === 0) {
            return res.status(400).json({ message: 'Необходимы имя, описание и хотя бы один сотрудник' });
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
        res.status(500).json({ message: 'Ошибка при добавлении проекта', err });
    }
};

// 📄 Получить один проект по ID
export const getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('owner members', '-password');
        if (!project) return res.status(404).json({ message: 'Проект не найден' });

        // Проверка: имеет ли пользователь доступ?
        const userId = req.user.userId;
        const isMember = project.members.some(member => member._id.toString() === userId);
        const isOwner = project.owner._id.toString() === userId;
        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Нет доступа к этому проекту' });
        }

        res.json(project);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка получения проекта', err });
    }
};

// ✏️ Обновить проект
export const updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Проект не найден' });

        if (project.owner.toString() !== req.user.userId)
            return res.status(403).json({ message: 'Только владелец может обновить проект' });

        Object.assign(project, req.body);
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка обновления проекта', err });
    }
};

// 🗑 Архивировать проект (мягкое удаление)
export const archiveProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Проект не найден' });

        if (project.owner.toString() !== req.user.userId)
            return res.status(403).json({ message: 'Только владелец может архивировать проект' });

        project.isArchived = true;
        await project.save();
        res.json({ message: 'Проект архивирован' });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка при архивировании', err });
    }
};

// get members of project
export const getProjectMembers = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Получаем проект по ID
        const project = await Project.findById(projectId)
            .populate('members', 'fullName email avatarUrl role position department') // Заменили imgHash на avatarUrl
            .exec();

        if (!project) {
            return res.status(404).json({ message: 'Проект не найден' });
        }

        // Возвращаем список сотрудников с дополнительными полями
        res.json(project.members);
    } catch (err) {
        console.error('Ошибка при получении сотрудников проекта:', err);
        res.status(500).json({ message: 'Ошибка при получении сотрудников проекта', err });
    }
};