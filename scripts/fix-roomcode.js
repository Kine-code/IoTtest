require('dotenv').config();
const mongoose = require('mongoose');
const Device = require('../src/models/Device');
const Room = require('../src/models/Room');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adminlte_mvc');
  const list = await Device.find({ $or: [{ roomCode: { $exists: false } }, { roomCode: '' }] });
  for (const d of list) {
    const r = await Room.findById(d.room).select('code');
    if (r) { d.roomCode = r.code; await d.save(); }
  }
  console.log('Fixed', list.length, 'devices');
  await mongoose.disconnect();
})();
