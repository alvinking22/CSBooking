const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  checkSetupStatus
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/setup-status', checkSetupStatus);

// Protected routes
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.put('/password', auth, changePassword);

module.exports = router;
