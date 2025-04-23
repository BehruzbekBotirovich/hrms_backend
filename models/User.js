import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    department: String,
    position: String,
    role: { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
    telegramId: String,
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

export default mongoose.model('User', UserSchema);
