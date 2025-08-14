// scripts/seed-floors.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Campus   = require('../src/models/Campus');
const Building = require('../src/models/Building');
const Floor    = require('../src/models/Floor');

// Helper: ensure floors 1..N for a building
async function ensureFloors(buildingDoc, total) {
  // tạo các tầng còn thiếu
  for (let level = 1; level <= total; level++) {
    await Floor.findOneAndUpdate(
      { building: buildingDoc._id, level },
      { building: buildingDoc._id, level, name: `Tầng ${level}` },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  // xóa tầng thừa (nếu có)
  await Floor.deleteMany({ building: buildingDoc._id, level: { $gt: total } });
}

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adminlte_mvc';
    await mongoose.connect(uri);

    // 1) Lấy/ tạo 2 cơ sở
    const campusBN = await Campus.findOneAndUpdate(
      { code: 'BN' }, { name: 'Bắc Ninh', code: 'BN' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const campusHN = await Campus.findOneAndUpdate(
      { code: 'HN' }, { name: 'Hà Nội', code: 'HN' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 2) Tạo/đảm bảo danh sách tòa
    // Bắc Ninh (ví dụ BN1, BN2… bạn có thể thêm bớt)
    const buildingsBN = ['BN1', 'BN2'];
    const bnDocs = [];
    for (const code of buildingsBN) {
      const b = await Building.findOneAndUpdate(
        { campus: campusBN._id, code },
        { campus: campusBN._id, code, name: code },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      bnDocs.push(b);
    }

    // Hà Nội (đúng tên bạn mô tả)
    const buildingsHN = [
      { code: 'EAUT',            name: 'EAUT',            floors: 3 },
      { code: 'Polyco',          name: 'Polyco',          floors: 9 },
      { code: 'Thuận Thành',     name: 'Thuận Thành',     floors: 8 },
      { code: 'Việt Nam Building', name: 'Việt Nam Building', floors: 6 },
      { code: 'Định Trọng Dật',  name: 'Định Trọng Dật',  floors: 7 },
    ];
    const hnDocs = [];
    for (const b of buildingsHN) {
      const doc = await Building.findOneAndUpdate(
        { campus: campusHN._id, code: b.code },
        { campus: campusHN._id, code: b.code, name: b.name },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      hnDocs.push({ doc, floors: b.floors });
    }

    // 3) Đảm bảo số tầng
    // Bắc Ninh: mỗi tòa 6 tầng
    for (const b of bnDocs) {
      await ensureFloors(b, 6);
    }
    // Hà Nội: theo từng tòa
    for (const { doc, floors } of hnDocs) {
      await ensureFloors(doc, floors);
    }

    console.log('✅ Seed floors done.');
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
