// models/AttendanceRecord.js
import mongoose from 'mongoose';

const AttendanceRecordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    isWeekend: { type: Boolean, default: false }
});


export default mongoose.model('Attendance', AttendanceRecordSchema);
