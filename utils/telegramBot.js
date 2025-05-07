import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';  // Импортируем node-fetch для запросов
import User from '../models/User.js';  // Импорт модели User
import { format } from 'date-fns';  // Импортируем функцию format из date-fns

const botToken = '7812173829:AAGsGjYvtjXNWGyi7JrXHFcJ9AN02OXFtSk';  // Ваш токен
const bot = new TelegramBot(botToken, { polling: true });

// Получаем номер телефона от пользователя
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const phone = msg.contact ? msg.contact.phone_number : null;  // Получаем номер телефона, если пользователь его отправил

    if (phone) {
        try {
            // Сохраняем chatId для пользователя в базе данных
            const user = await User.findOneAndUpdate({ phone }, { chatId }, { upsert: true });
            console.log(`User ${phone} chatId saved: ${chatId}`);
        } catch (error) {
            console.error('Ошибка при сохранении chatId:', error);
        }
    }
});

// Функция для отправки сообщения в Telegram
export const sendTelegramMessage = async (chatId, message) => {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,  // chatId из базы данных
                text: message,    // Сообщение
            })
        });

        if (!response.ok) {
            throw new Error('Не удалось отправить сообщение');
        }
        console.log('Сообщение отправлено в Telegram');
    } catch (error) {
        console.error('Ошибка при отправке сообщения в Telegram:', error);
    }
};

// Уведомление о создании задачи
export const notifyTaskCreated = async (task) => {
    const message = `
        📩 Новая задача создана:
        
        🔖 Задача: "${task.title}"
        📋 Описание: ${task.description || 'Нет описания'}
        🔑 Статус: ${task.status}
        ⏳ Приоритет: ${task.priority || 'Не указан'}
        🗓 Дата начала: ${task.startDate ? format(new Date(task.startDate), 'MMM dd, yyyy, HH:mm') : 'Не указана'}
        🗓 Дата окончания: ${task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy, HH:mm') : 'Не указана'}
        
        Создатель: ${task.createdBy.fullName}
    `;

    // Получаем chatId создателя задачи
    const creator = await User.findById(task.createdBy);
    if (creator && creator.chatId) {
        await sendTelegramMessage(creator.chatId, message);  // Отправляем сообщение создателю задачи
    } else {
        console.log(`Создатель задачи ${task.createdBy} не имеет chatId`);
    }

    // Отправляем сообщения назначенным пользователям
    for (const assignedUser of task.assignedTo) {
        const user = await User.findById(assignedUser);  // Или используйте другое поле для поиска пользователя
        if (user && user.chatId) {
            await sendTelegramMessage(user.chatId, message);  // Отправляем сообщение назначенному пользователю
        } else {
            console.log(`Пользователь ${assignedUser} не имеет chatId`);
        }
    }
};

// Пример команды для теста
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Привет, я твой бот, который будет сообщать о твоих задачах');
});
