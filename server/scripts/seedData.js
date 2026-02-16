const { Equipment, Booking, BusinessConfig } = require('../models');
require('dotenv').config();

const seedData = async () => {
  try {
    console.log('🌱 Seeding database with sample data...');

    // Add sample equipment
    const equipmentData = [
      // Cameras
      {
        name: 'Sony A7 III',
        category: 'cameras',
        description: 'Cámara profesional full-frame de 24.2MP',
        quantity: 2,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 1
      },
      {
        name: 'Canon EOS R5',
        category: 'cameras',
        description: 'Cámara mirrorless 8K de gama alta',
        quantity: 1,
        isIncluded: false,
        extraCost: 50.00,
        isActive: true,
        order: 2
      },
      // Microphones
      {
        name: 'Shure SM7B',
        category: 'microphones',
        description: 'Micrófono dinámico profesional para voces',
        quantity: 3,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 3
      },
      {
        name: 'Rode NT1-A',
        category: 'microphones',
        description: 'Micrófono de condensador de gran diafragma',
        quantity: 2,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 4
      },
      {
        name: 'Sennheiser MKH 416',
        category: 'microphones',
        description: 'Micrófono shotgun profesional',
        quantity: 1,
        isIncluded: false,
        extraCost: 30.00,
        isActive: true,
        order: 5
      },
      // Lights
      {
        name: 'Softbox LED 2x1000W',
        category: 'lights',
        description: 'Kit de iluminación profesional con softbox',
        quantity: 2,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 6
      },
      {
        name: 'Ring Light 18"',
        category: 'lights',
        description: 'Luz circular para retratos y close-ups',
        quantity: 2,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 7
      },
      {
        name: 'Aputure 120D II',
        category: 'lights',
        description: 'Luz LED COB de alta potencia',
        quantity: 1,
        isIncluded: false,
        extraCost: 40.00,
        isActive: true,
        order: 8
      },
      // Backgrounds
      {
        name: 'Fondo Verde Chroma',
        category: 'backgrounds',
        description: 'Fondo verde para efectos especiales',
        quantity: 1,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 9
      },
      {
        name: 'Fondo Blanco',
        category: 'backgrounds',
        description: 'Fondo blanco profesional',
        quantity: 1,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 10
      },
      {
        name: 'Fondo Negro',
        category: 'backgrounds',
        description: 'Fondo negro profesional',
        quantity: 1,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 11
      },
      // Audio
      {
        name: 'Focusrite Scarlett 2i2',
        category: 'audio',
        description: 'Interfaz de audio USB',
        quantity: 2,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 12
      },
      {
        name: 'Audífonos Sony MDR-7506',
        category: 'audio',
        description: 'Audífonos de monitoreo profesional',
        quantity: 4,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 13
      },
      // Accessories
      {
        name: 'Teleprompter',
        category: 'accessories',
        description: 'Teleprompter para lectura de guiones',
        quantity: 1,
        isIncluded: false,
        extraCost: 25.00,
        isActive: true,
        order: 14
      },
      {
        name: 'Boom Pole',
        category: 'accessories',
        description: 'Caña para micrófono',
        quantity: 2,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 15
      },
      // Furniture
      {
        name: 'Mesa de Podcast',
        category: 'furniture',
        description: 'Mesa moderna para 3-4 personas',
        quantity: 1,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 16
      },
      {
        name: 'Sillas Ergonómicas',
        category: 'furniture',
        description: 'Sillas cómodas para sesiones largas',
        quantity: 4,
        isIncluded: true,
        extraCost: 0,
        isActive: true,
        order: 17
      }
    ];

    await Equipment.bulkCreate(equipmentData);
    console.log(`✅ Created ${equipmentData.length} sample equipment items`);

    // Add some sample bookings (upcoming)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const bookingsData = [
      {
        clientName: 'Juan Pérez',
        clientEmail: 'juan.perez@example.com',
        clientPhone: '+1 809-555-0101',
        sessionDate: tomorrow.toISOString().split('T')[0],
        startTime: '10:00:00',
        endTime: '12:00:00',
        duration: 2,
        contentType: 'podcast',
        projectDescription: 'Grabación de episodio #15 del podcast "Tech Talk"',
        basePrice: 100.00,
        equipmentCost: 0,
        totalPrice: 100.00,
        status: 'confirmed',
        paymentStatus: 'paid',
        paidAmount: 100.00,
        remainingAmount: 0,
        paymentMethod: 'transfer'
      },
      {
        clientName: 'María González',
        clientEmail: 'maria.gonzalez@example.com',
        clientPhone: '+1 809-555-0102',
        sessionDate: nextWeek.toISOString().split('T')[0],
        startTime: '14:00:00',
        endTime: '17:00:00',
        duration: 3,
        contentType: 'youtube',
        projectDescription: 'Video tutorial de cocina',
        basePrice: 150.00,
        equipmentCost: 0,
        totalPrice: 150.00,
        status: 'pending',
        paymentStatus: 'pending',
        paidAmount: 0,
        remainingAmount: 150.00
      }
    ];

    await Booking.bulkCreate(bookingsData);
    console.log(`✅ Created ${bookingsData.length} sample bookings`);

    console.log('\n🎉 Sample data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
