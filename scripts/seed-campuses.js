const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Campus = require('../src/models/Campus');
const Building = require('../src/models/Building');

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adminlte_mvc';
    await mongoose.connect(uri);

    // Tạo 2 cơ sở
    const campuses = [
      { name: 'Bắc Ninh', code: 'BN' },
      { name: 'Hà Nội',   code: 'HN' },
    ];
    const campusDocs = {};
    for (const c of campuses) {
      campusDocs[c.code] = await Campus.findOneAndUpdate(
        { code: c.code }, c, { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Tòa nhà theo từng cơ sở
    const buildingsBN = ['BN1', 'BN2'];
    const buildingsHN = ['Polyco', 'Định Trọng Dật', 'EAUT', 'Việt Nam Building', 'Thuận Thành'];

    for (const b of buildingsBN) {
      await Building.findOneAndUpdate(
        { campus: campusDocs.BN._id, code: b },
        { campus: campusDocs.BN._id, code: b, name: b },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    for (const b of buildingsHN) {
      await Building.findOneAndUpdate(
        { campus: campusDocs.HN._id, code: b },
        { campus: campusDocs.HN._id, code: b, name: b },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log('✅ Seeded campuses & buildings');
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
