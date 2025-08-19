// scripts/seed-logs.js
require('dotenv').config();
const mongoose = require('mongoose');
const Log = require('../src/models/Log');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adminlte_mvc');

  const now = new Date();
  const start = new Date(now.getTime() - 90*60000); // 90 phút trước
  const off   = new Date(now.getTime() - 30*60000); // 30 phút trước

  await Log.create([
    { device: null, room: null, led: 'LED1', state: 'on',  at: start },
    { device: null, room: null, led: 'LED1', state: 'off', at: off   },
  ]);

  console.log('Seeded sample logs');
  await mongoose.disconnect();
})();
