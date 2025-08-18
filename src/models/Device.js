const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  room:     { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  roomCode: { type: String, required: true, trim: true, index: true }, // sẽ auto-fill
  name:     { type: String, required: true, trim: true },
  type:     { type: String, enum: ['esp32','light','fan','ac','sensor','other'], default: 'esp32', index: true },
  espIp:    { type: String, required: true, trim: true },
  token:    { type: String, required: true, trim: true },
  channels: [{
    key:   { type: String, required: true },
    label: { type: String, required: true },
    isOn:  { type: Boolean, default: false }
  }],
  status:   { type: String, enum: ['online','offline','error'], default: 'offline', index: true },
  lastHeartbeat: { type: Date },
  meta:     { type: Object, default: {} }
}, { timestamps: true });

deviceSchema.index({ room: 1, name: 1 }, { unique: true });

// ✅ Auto-fill roomCode từ Room trước khi validate
deviceSchema.pre('validate', async function(next) {
  try {
    if (!this.roomCode && this.room) {
      const Room = mongoose.model('Room');
      const r = await Room.findById(this.room).select('code').lean();
      if (r) this.roomCode = r.code;
    }
    next();
  } catch (e) { next(e); }
});

module.exports = mongoose.model('Device', deviceSchema);
