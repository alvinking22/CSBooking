const { ServiceType } = require('../models');

// GET /api/services - Público, solo activos
const getAll = async (req, res) => {
  try {
    const where = {};
    // Admin puede ver todos, público solo activos
    if (!req.user) {
      where.isActive = true;
    }
    const services = await ServiceType.findAll({
      where,
      order: [['order', 'ASC'], ['name', 'ASC']],
    });
    res.json({ success: true, data: { services } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener servicios', error: error.message });
  }
};

// GET /api/services/:id
const getById = async (req, res) => {
  try {
    const service = await ServiceType.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }
    res.json({ success: true, data: { service } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener servicio', error: error.message });
  }
};

// POST /api/services - Admin
const create = async (req, res) => {
  try {
    const { name, description, basePrice, duration, isActive, order } = req.body;
    if (!name || !basePrice || !duration) {
      return res.status(400).json({ success: false, message: 'Nombre, precio y duración son requeridos' });
    }
    const service = await ServiceType.create({ name, description, basePrice, duration, isActive, order });
    res.status(201).json({ success: true, data: { service } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear servicio', error: error.message });
  }
};

// PUT /api/services/:id - Admin
const update = async (req, res) => {
  try {
    const service = await ServiceType.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }
    const { name, description, basePrice, duration, isActive, order } = req.body;
    await service.update({ name, description, basePrice, duration, isActive, order });
    res.json({ success: true, data: { service } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar servicio', error: error.message });
  }
};

// DELETE /api/services/:id - Admin (soft delete)
const remove = async (req, res) => {
  try {
    const service = await ServiceType.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }
    await service.update({ isActive: false });
    res.json({ success: true, message: 'Servicio desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar servicio', error: error.message });
  }
};

// PUT /api/services/:id/reorder - Admin
const reorder = async (req, res) => {
  try {
    const service = await ServiceType.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }
    const { order } = req.body;
    await service.update({ order });
    res.json({ success: true, data: { service } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al reordenar servicio', error: error.message });
  }
};

module.exports = { getAll, getById, create, update, remove, reorder };
