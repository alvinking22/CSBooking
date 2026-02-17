/**
 * Migration script - safe to run on existing databases.
 * Adds new columns/tables without dropping existing data.
 * Run with: node scripts/migrate.js
 */
const { sequelize, ServiceType } = require('../models');
require('dotenv').config();

const migrate = async () => {
  const qi = sequelize.getQueryInterface();

  try {
    console.log('🔄 Running migrations...');

    // ─── 1. Create service_types table if it doesn't exist ───────────────────
    await sequelize.sync({ force: false }); // creates missing tables only
    console.log('✅ Tables synced (new tables created if missing)');

    // ─── 2. Add columns to existing tables (safe: checks before adding) ──────

    const safeAddColumn = async (table, column, definition) => {
      try {
        await qi.addColumn(table, column, definition);
        console.log(`  ✅ Added column "${column}" to "${table}"`);
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          console.log(`  ⏭️  Column "${column}" already exists in "${table}", skipping`);
        } else {
          throw err;
        }
      }
    };

    const { DataTypes } = require('sequelize');

    // bookings table: serviceTypeId
    await safeAddColumn('bookings', 'serviceTypeId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'service_types', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // business_config table: useTimeBlocks, timeBlocks
    await safeAddColumn('business_config', 'useTimeBlocks', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    });
    await safeAddColumn('business_config', 'timeBlocks', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: JSON.stringify([
        { time: '10:00', label: 'Mañana (10am)' },
        { time: '15:00', label: 'Tarde (3pm)' },
        { time: '17:00', label: 'Tarde-Noche (5pm)' },
        { time: '19:00', label: 'Noche (7pm)' },
      ]),
    });

    // equipment table: allowQuantitySelection, options
    await safeAddColumn('equipment', 'allowQuantitySelection', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    });
    await safeAddColumn('equipment', 'options', {
      type: DataTypes.JSONB,
      allowNull: true,
    });

    // booking_equipment table: quantity (may already exist), selectedOption
    await safeAddColumn('booking_equipment', 'quantity', {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    });
    await safeAddColumn('booking_equipment', 'selectedOption', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    // ─── 3. Seed default service types if none exist ─────────────────────────
    const count = await ServiceType.count();
    if (count === 0) {
      await ServiceType.bulkCreate([
        { name: 'Podcast', description: 'Sesión de grabación para podcast', basePrice: 100.00, duration: 2, order: 1 },
        { name: 'Música', description: 'Sesión de grabación musical', basePrice: 150.00, duration: 3, order: 2 },
        { name: 'Video', description: 'Sesión de grabación de video', basePrice: 200.00, duration: 4, order: 3 },
      ]);
      console.log('✅ Default service types seeded (Podcast, Música, Video)');
    } else {
      console.log(`⏭️  Service types already exist (${count} found), skipping seed`);
    }

    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

migrate();
