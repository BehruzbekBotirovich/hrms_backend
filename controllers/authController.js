import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

export const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.isActive)
        return res.status(401).json({ message: 'Неверные учетные данные' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
        return res.status(401).json({ message: 'Неверные учетные данные' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({ accessToken, refreshToken });
};
