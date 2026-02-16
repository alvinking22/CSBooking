const express = require('express');
const router = express.Router();
const {
  getConfig,
  updateConfig,
  uploadLogo,
  updateOperatingHours,
  updatePricing,
  updateAzulConfig,
  completeSetup,
  getPublicConfig
} = require('../controllers/configController');
const { auth, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.get('/public', getPublicConfig);

// Protected routes (Admin only)
router.get('/', auth, authorize('admin'), getConfig);
router.put('/', auth, authorize('admin'), updateConfig);
router.post('/logo', auth, authorize('admin'), upload.single('logo'), uploadLogo);
router.put('/hours', auth, authorize('admin'), updateOperatingHours);
router.put('/pricing', auth, authorize('admin'), updatePricing);
router.put('/azul', auth, authorize('admin'), updateAzulConfig);
router.post('/complete-setup', auth, authorize('admin'), completeSetup);

module.exports = router;
