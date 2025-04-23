import User from '../models/User.js';

// 👤 Получить текущего пользователя user/me
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
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
            req.body,
            {new: true}
        ).select('-password');
        if (!updatedUser) return res.status(404).json({message: 'Пользователь не найден'});
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({message: 'Ошибка обновления профиля', error});
        console.log(error)
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

