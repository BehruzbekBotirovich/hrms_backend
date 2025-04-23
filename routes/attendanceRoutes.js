import express from 'express';
import {verifyToken} from '../middleware/authMiddleware.js';
import {
    addAttendance,
    // getAttendanceByDate,
    getAttendanceByMonth
} from '../controllers/attendanceController.js';


const router = express.Router();

router.post('/', verifyToken, addAttendance);
router.get('/:userId/month/:month/year/:year', verifyToken, getAttendanceByMonth);  // Пример: /api/attendance/68065b18de9a89448c81c52f/month/04/year/2025
// router.get('/:userId/:date', verifyToken, getAttendanceByDate);  // Пример: /api/attendance/68065b18de9a89448c81c52f/2025-04-22

export default router;