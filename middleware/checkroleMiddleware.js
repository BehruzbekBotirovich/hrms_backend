// middlewares/checkRole.js
export const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user.role; // `req.user` должен быть заполнен в auth middleware

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'Доступ запрещён' });
        }

        next();
    };
};
