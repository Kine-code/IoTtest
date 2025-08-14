require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Menu = require('../src/models/Menu');

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adminlte_mvc';
    if (!uri) throw new Error('MONGODB_URI is empty');
    await mongoose.connect(uri);

    await Menu.deleteMany({}); // nếu không muốn xoá, bỏ dòng này đi

    const items = [
      { title: 'Dashboard', path: '/',         icon: 'bi bi-speedometer', order: 1, roles: ['admin','staff','viewer'] },
      { title: 'Tài khoản', path: '/users',    icon: 'bi bi-people',      order: 2, roles: ['admin'] },
      { title: 'Tòa nhà',   path: '/buildings',icon: 'bi bi-building',    order: 3, roles: ['admin','staff'] },
      { title: 'Tầng',      path: '/floors',   icon: 'bi bi-grid-3x3-gap',order: 4, roles: ['admin','staff'] },
      { title: 'Phòng',     path: '/rooms',    icon: 'bi bi-door-closed', order: 5, roles: ['admin','staff','viewer'] },
      { title: 'Thiết bị',  path: '/devices',  icon: 'bi bi-cpu',         order: 6, roles: ['admin','staff','viewer'] },
    ];

    await Menu.insertMany(items);
    console.log('✅ Seeded menus:', items.length);
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
