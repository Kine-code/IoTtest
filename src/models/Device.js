const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  room:     { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  name:     { type: String, required: true, trim: true },
  type:     { type: String, enum: ['light', 'fan', 'ac', 'sensor', 'other'], default: 'other', index: true },
  status:   { type: String, enum: ['online', 'offline', 'error'], default: 'offline', index: true },
  isOn:     { type: Boolean, default: false },
  lastHeartbeat: { type: Date },
  meta:     { type: Object, default: {} } // thông tin kỹ thuật/địa chỉ MQTT/MAC,...
}, { timestamps: true });

deviceSchema.index({ room: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Device', deviceSchema);
