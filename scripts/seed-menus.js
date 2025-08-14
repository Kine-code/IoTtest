// scripts/seed-menus.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Menu = require('../src/models/Menu');

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adminlte_mvc';
    await mongoose.connect(uri);

    // Danh sách menu CHUẨN theo mô hình mới
    const menus = [
      { title: 'Dashboard',       path: '/',         icon: 'bi bi-speedometer', order: 1, roles: ['admin','staff','viewer'], visible: true },
      { title: 'Quản lý cơ sở',   path: '/campuses', icon: 'bi bi-building',    order: 2, roles: ['admin','staff','viewer'], visible: true },
      { title: 'Quản lý tài khoản', path: '/users',  icon: 'bi bi-people',      order: 3, roles: ['admin'],                  visible: true },
      { title: 'Quản lý thiết bị', path: '/devices', icon: 'bi bi-cpu',         order: 4, roles: ['admin','staff','viewer'], visible: true },
    ];

    // Upsert theo path để chạy nhiều lần không bị trùng
    for (const m of menus) {
      await Menu.findOneAndUpdate(
        { path: m.path },
        { $set: m },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // (Tuỳ chọn) Xoá các menu không còn trong danh sách mới
    const keepPaths = menus.map(m => m.path);
    await Menu.deleteMany({ path: { $nin: keepPaths } });

    console.log('✅ Seed menus done.');
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
