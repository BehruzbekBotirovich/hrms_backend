import TelegramBot from 'node-telegram-bot-api';

const token = '7812173829:AAGsGjYvtjXNWGyi7JrXHFcJ9AN02OXFtSk'; // Ваш токен бота
const bot = new TelegramBot(token, { polling: true });

// Функция для отправки сообщения с обработкой ошибки 429
export const sendTelegramMessage = async (chatId, message) => {
    try {
        const response = await bot.sendMessage(chatId, message);
        console.log(`Сообщение отправлено: ${response.message_id}`);
    } catch (error) {
        if (error.code === 'ETELEGRAM' && error.message.includes('429')) {
            const retryAfter = parseInt(error.parameters.retry_after); // Получаем время задержки от Telegram
            console.log(`Превышен лимит запросов, повторная попытка через ${retryAfter} секунд...`);
            // Подождать указанное время перед повторной отправкой
            setTimeout(() => sendTelegramMessage(chatId, message), retryAfter * 1000);
        } else {
            console.error('Ошибка отправки сообщения:', error);
        }
    }
};

// Пример функции для уведомления о создании задачи
export const notifyTaskCreated = async (task) => {
    const message = `Задача "${task.title}" была успешно создана!\nОписание: ${task.description}\nСтатус: ${task.status}`;
    await sendTelegramMessage(task.createdBy.telegramId, message);
    for (let user of task.assignedTo) {
        await sendTelegramMessage(user.telegramId, message);
    }
};

// Пример функции для уведомления о изменении статуса задачи
export const notifyTaskStatusChanged = async (task, oldStatus) => {
    console.log('notifyTaskStatusChanged', task, oldStatus);
    const message = `Статус задачи "${task.title}" был изменен с "${oldStatus}" на "${task.status}".`;
    await sendTelegramMessage(task.createdBy.telegramId, message);
    for (let user of task.assignedTo) {
        await sendTelegramMessage(user.telegramId, message);
    }
};
