const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { register, login, logout, sendOTP, resetPassword, me } = require('../controllers/scholar.Controller');

router.post('/register', register);
router.post('/login', login);
router.post("/send-otp",sendOTP);
router.post("/reset-password",resetPassword);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;