const { syncDatabase, User, BusinessConfig } = require('../models');
require('dotenv').config();

const setupDatabase = async () => {
  try {
    console.log('🔄 Setting up database...');

    // Sync all models
    await syncDatabase({ force: true }); // WARNING: This drops all tables!

    console.log('✅ Database schema created');

    // Create default admin user
    const adminUser = await User.create({
      email: 'admin@studio.com',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    console.log('✅ Default admin user created');
    console.log('   Email: admin@studio.com');
    console.log('   Password: Admin123!');
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');

    // Create default business configuration
    const businessConfig = await BusinessConfig.create({
      businessName: 'CS Booking',
      email: process.env.EMAIL_USER || 'info@studio.com',
      phone: '',
      address: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      currency: 'USD',
      hourlyRate: 50.00,
      minSessionDuration: 1,
      maxSessionDuration: 8,
      bufferTime: 30,
      requireDeposit: false,
      depositType: 'percentage',
      depositAmount: 50,
      sendConfirmationEmail: true,
      sendReminderEmail: true,
      reminderHoursBefore: 24,
      setupCompleted: false
    });

    console.log('✅ Default business configuration created');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Login with the admin credentials');
    console.log('   3. Complete the setup wizard');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
};

setupDatabase();
