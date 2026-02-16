const express = require('express');
const router = express.Router();
const {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  uploadEquipmentImage,
  getEquipmentByCategory,
  reorderEquipment,
  getEquipmentStats
} = require('../controllers/equipmentController');
const { auth, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.get('/', getAllEquipment);
router.get('/stats/categories', getEquipmentStats);
router.get('/category/:category', getEquipmentByCategory);
router.get('/:id', getEquipmentById);

// Protected routes (Admin only)
router.post('/', auth, authorize('admin'), createEquipment);
router.put('/:id', auth, authorize('admin'), updateEquipment);
router.delete('/:id', auth, authorize('admin'), deleteEquipment);
router.post('/:id/image', auth, authorize('admin'), upload.single('equipment'), uploadEquipmentImage);
router.put('/order/reorder', auth, authorize('admin'), reorderEquipment);

module.exports = router;
