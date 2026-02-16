const { BusinessConfig } = require('../models');
const { deleteFile } = require('../middleware/upload');

// @desc    Get business configuration
// @route   GET /api/config
// @access  Public
exports.getConfig = async (req, res, next) => {
  try {
    let config = await BusinessConfig.findOne();

    // If no config exists, create default one
    if (!config) {
      config = await BusinessConfig.create({
        businessName: 'CS Booking',
        email: process.env.EMAIL_USER || 'info@studio.com',
        currency: 'USD'
      });
    }

    res.json({
      success: true,
      data: { config }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update business configuration
// @route   PUT /api/config
// @access  Private/Admin
exports.updateConfig = async (req, res, next) => {
  try {
    let config = await BusinessConfig.findOne();

    if (!config) {
      config = await BusinessConfig.create(req.body);
    } else {
      await config.update(req.body);
    }

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: { config }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload logo
// @route   POST /api/config/logo
// @access  Private/Admin
exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    let config = await BusinessConfig.findOne();
    if (!config) {
      config = await BusinessConfig.create({});
    }

    // Delete old logo if exists
    if (config.logo) {
      deleteFile(config.logo);
    }

    // Update logo path
    const logoPath = `/uploads/logos/${req.file.filename}`;
    await config.update({ logo: logoPath });

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo: logoPath
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update operating hours
// @route   PUT /api/config/hours
// @access  Private/Admin
exports.updateOperatingHours = async (req, res, next) => {
  try {
    const { operatingHours } = req.body;

    let config = await BusinessConfig.findOne();
    if (!config) {
      config = await BusinessConfig.create({ operatingHours });
    } else {
      await config.update({ operatingHours });
    }

    res.json({
      success: true,
      message: 'Operating hours updated successfully',
      data: { operatingHours: config.operatingHours }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update pricing
// @route   PUT /api/config/pricing
// @access  Private/Admin
exports.updatePricing = async (req, res, next) => {
  try {
    const { hourlyRate, packages, requireDeposit, depositType, depositAmount, currency } = req.body;

    let config = await BusinessConfig.findOne();
    if (!config) {
      config = await BusinessConfig.create({});
    }

    const updateData = {};
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (packages !== undefined) updateData.packages = packages;
    if (requireDeposit !== undefined) updateData.requireDeposit = requireDeposit;
    if (depositType !== undefined) updateData.depositType = depositType;
    if (depositAmount !== undefined) updateData.depositAmount = depositAmount;
    if (currency !== undefined) updateData.currency = currency;

    await config.update(updateData);

    res.json({
      success: true,
      message: 'Pricing updated successfully',
      data: { config }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Azul configuration
// @route   PUT /api/config/azul
// @access  Private/Admin
exports.updateAzulConfig = async (req, res, next) => {
  try {
    const { azulEnabled, azulMerchantId, azulAuthKey, azulMode } = req.body;

    let config = await BusinessConfig.findOne();
    if (!config) {
      config = await BusinessConfig.create({});
    }

    await config.update({
      azulEnabled,
      azulMerchantId,
      azulAuthKey,
      azulMode
    });

    res.json({
      success: true,
      message: 'Azul configuration updated successfully',
      data: {
        azulEnabled: config.azulEnabled,
        azulMode: config.azulMode
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete setup wizard
// @route   POST /api/config/complete-setup
// @access  Private/Admin
exports.completeSetup = async (req, res, next) => {
  try {
    let config = await BusinessConfig.findOne();
    if (!config) {
      config = await BusinessConfig.create({});
    }

    await config.update({ setupCompleted: true });

    res.json({
      success: true,
      message: 'Setup completed successfully',
      data: { config }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public configuration (for client booking page)
// @route   GET /api/config/public
// @access  Public
exports.getPublicConfig = async (req, res, next) => {
  try {
    const config = await BusinessConfig.findOne();

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    // Return only public fields
    const publicConfig = {
      businessName: config.businessName,
      logo: config.logo,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      email: config.email,
      phone: config.phone,
      address: config.address,
      instagram: config.instagram,
      facebook: config.facebook,
      website: config.website,
      operatingHours: config.operatingHours,
      minSessionDuration: config.minSessionDuration,
      maxSessionDuration: config.maxSessionDuration,
      hourlyRate: config.hourlyRate,
      currency: config.currency,
      packages: config.packages,
      requireDeposit: config.requireDeposit,
      depositType: config.depositType,
      depositAmount: config.depositAmount,
      termsAndConditions: config.termsAndConditions,
      cancellationPolicy: config.cancellationPolicy,
      azulEnabled: config.azulEnabled
    };

    res.json({
      success: true,
      data: { config: publicConfig }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
