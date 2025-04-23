import mongoose from 'mongoose';

const BoardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    statusColumns: {
        type: [String],
        default: ['Created', 'In Progress', 'Review', 'Test', 'Merge']
    },
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Board', BoardSchema);
