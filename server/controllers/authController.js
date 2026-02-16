const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @desc    Register new admin user
// @route   POST /api/auth/register
// @access  Public (only if no users exist, otherwise Private/Admin)
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if this is the first user (allow without auth)
    const userCount = await User.count();
    if (userCount > 0 && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create new users'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: userCount === 0 ? 'admin' : 'staff' // First user is admin
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: user.toSafeObject(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toSafeObject()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email } = req.body;

    // Check if email is being changed and already exists
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update user
    await req.user.update({
      firstName: firstName || req.user.firstName,
      lastName: lastName || req.user.lastName,
      email: email || req.user.email
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: req.user.toSafeObject()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Verify current password
    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await req.user.update({ password: newPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if setup is complete
// @route   GET /api/auth/setup-status
// @access  Public
exports.checkSetupStatus = async (req, res, next) => {
  try {
    const userCount = await User.count();
    const hasUsers = userCount > 0;

    res.json({
      success: true,
      data: {
        hasUsers,
        setupComplete: hasUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
