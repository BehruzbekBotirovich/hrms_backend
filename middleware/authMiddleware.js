import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ message: 'Нет access token' });

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded; // теперь доступен req.user.userId и т.д.
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Неверный или просроченный токен' });
    }
};