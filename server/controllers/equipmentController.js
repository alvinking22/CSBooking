const { Equipment } = require('../models');
const { deleteFile } = require('../middleware/upload');
const { Op } = require('sequelize');

// @desc    Get all equipment
// @route   GET /api/equipment
// @access  Public
exports.getAllEquipment = async (req, res, next) => {
  try {
    const { category, isActive } = req.query;

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const equipment = await Equipment.findAll({
      where,
      order: [['order', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: equipment.length,
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get equipment by ID
// @route   GET /api/equipment/:id
// @access  Public
exports.getEquipmentById = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create equipment
// @route   POST /api/equipment
// @access  Private/Admin
exports.createEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Equipment created successfully',
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update equipment
// @route   PUT /api/equipment/:id
// @access  Private/Admin
exports.updateEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    await equipment.update(req.body);

    res.json({
      success: true,
      message: 'Equipment updated successfully',
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private/Admin
exports.deleteEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    // Delete image if exists
    if (equipment.image) {
      deleteFile(equipment.image);
    }

    await equipment.destroy();

    res.json({
      success: true,
      message: 'Equipment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload equipment image
// @route   POST /api/equipment/:id/image
// @access  Private/Admin
exports.uploadEquipmentImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const equipment = await Equipment.findByPk(req.params.id);

    if (!equipment) {
      // Delete uploaded file
      deleteFile(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    // Delete old image if exists
    if (equipment.image) {
      deleteFile(equipment.image);
    }

    // Update image path
    const imagePath = `/uploads/equipment/${req.file.filename}`;
    await equipment.update({ image: imagePath });

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        equipment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get equipment by category
// @route   GET /api/equipment/category/:category
// @access  Public
exports.getEquipmentByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const equipment = await Equipment.findAll({
      where: {
        category,
        isActive: true
      },
      order: [['order', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      count: equipment.length,
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update equipment order
// @route   PUT /api/equipment/reorder
// @access  Private/Admin
exports.reorderEquipment = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of { id, order }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items must be an array'
      });
    }

    // Update each item's order
    await Promise.all(
      items.map(item =>
        Equipment.update(
          { order: item.order },
          { where: { id: item.id } }
        )
      )
    );

    res.json({
      success: true,
      message: 'Equipment reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get equipment categories with counts
// @route   GET /api/equipment/stats/categories
// @access  Public
exports.getEquipmentStats = async (req, res, next) => {
  try {
    const stats = await Equipment.findAll({
      attributes: [
        'category',
        [Equipment.sequelize.fn('COUNT', Equipment.sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['category']
    });

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
