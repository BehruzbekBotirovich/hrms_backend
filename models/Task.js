import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    status: {
        type: String,
        enum: ['Created', 'InProgress', 'Review', 'Test', 'Merge'],
        default: 'Created'
    },
    priority: {
        type: String,
        enum: ['Low', 'Normal', 'Medium', 'High', 'Urgent'],
    },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    taskImg: { type: String, default: null },
    estimatedHours: { type: Number, default: null },
    startDate: Date,
    dueDate: Date,
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    statusUpdatedAt: { type: Date, default: null } // ⬅️ добавь это поле
});

// ⬇️ добавь этот хук ниже
TaskSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        this.statusUpdatedAt = new Date();
    }
    next();
});

export default mongoose.model('Task', TaskSchema);
