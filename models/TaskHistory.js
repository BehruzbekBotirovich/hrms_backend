import mongoose from 'mongoose';

const TaskHistorySchema = new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    action: { type: String, required: true },
    fromStatus: String,
    toStatus: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('TaskHistory', TaskHistorySchema);
