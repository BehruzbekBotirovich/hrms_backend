import AttendanceRecord from '../models/AttendanceRecord.js';

export const addAttendance = async (req, res) => {
    try {
        const { userId, startTime, endTime } = req.body;

        if (!userId || !startTime || !endTime) {
            return res.status(400).json({ message: 'userId, startTime, endTime обязательны' });
        }

        // Логирование входных данных для отладки
        console.log('Received startTime:', startTime);
        console.log('Received endTime:', endTime);

        // Преобразуем строки в объект Date
        const start = new Date(startTime);
        const end = new Date(endTime);

        // Проверяем, является ли дата валидной
        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ message: 'Неверный формат startTime или endTime' });
        }

        // Проверка, что endTime не раньше startTime
        if (end <= start) {
            return res.status(400).json({ message: 'endTime не может быть раньше startTime' });
        }

        // День посещения
        const dateOnly = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));

        // Определяем выходной ли это день
        const dayOfWeek = start.getUTCDay(); // 0 = Воскресенье, 6 = Суббота
        const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;

        // Длительность работы в минутах
        const durationMinutes = Math.round((end - start) / 60000);

        // Создаем запись о посещении
        const newAttendanceRecord = new AttendanceRecord({
            userId,
            date: dateOnly, // Используем дату без времени
            startTime,      // Время входа
            endTime,        // Время выхода
            durationMinutes,
            isWeekend
        });

        await newAttendanceRecord.save();

        res.status(201).json(newAttendanceRecord);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при добавлении записи', error: err.message });
    }
};

export const getAttendanceByMonth = async (req, res) => {
    try {
        const { userId, month, year } = req.params;

        // Форматируем и проверяем дату
        const formattedMonth = month.padStart(2, '0'); // Например, '4' -> '04'
        const startOfMonth = new Date(`${year}-${formattedMonth}-01T00:00:00Z`);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(startOfMonth.getMonth() + 1); // Переходим на следующий месяц
        endOfMonth.setDate(0); // Устанавливаем последний день текущего месяца

        // Проверяем на корректность
        if (isNaN(startOfMonth) || isNaN(endOfMonth)) {
            return res.status(400).json({ message: 'Неверный формат даты', startOfMonth, endOfMonth });
        }

        const records = await AttendanceRecord.find({
            userId,
            date: { $gte: startOfMonth, $lt: endOfMonth }
        });

        const groupedData = {};

        // Группируем по дням
        records.forEach(record => {
            const dateKey = record.date.toISOString().split('T')[0]; // "YYYY-MM-DD"
            if (!groupedData[dateKey]) {
                groupedData[dateKey] = {
                    hours: 0,
                    minutes: 0
                };
            }

            const durationMinutes = record.durationMinutes;
            groupedData[dateKey].minutes += durationMinutes;
            groupedData[dateKey].hours = Math.floor(groupedData[dateKey].minutes / 60);
            groupedData[dateKey].minutes = groupedData[dateKey].minutes % 60;
        });

        res.json(groupedData);
    } catch (error) {
        console.error('Ошибка при получении посещаемости за месяц:', error);
        res.status(500).json({ message: 'Ошибка при получении данных посещаемости', error });
    }
};
