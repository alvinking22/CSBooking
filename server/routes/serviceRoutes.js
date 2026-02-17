const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getAll,
  getById,
  create,
  update,
  remove,
  reorder,
} = require('../controllers/serviceTypeController');

// Rutas públicas
router.get('/', getAll);
router.get('/:id', getById);

// Rutas admin
router.post('/', auth, authorize('admin'), create);
router.put('/:id/reorder', auth, authorize('admin'), reorder);
router.put('/:id', auth, authorize('admin'), update);
router.delete('/:id', auth, authorize('admin'), remove);

module.exports = router;
