const mongoose = require('mongoose');
const { Schema } = mongoose;

const LogSchema = new Schema({
  device: { type: Schema.Types.ObjectId, ref: 'Device' },
  room:   { type: Schema.Types.ObjectId, ref: 'Room' },
  led:    { type: String, enum: ['LED1', 'LED2'], required: true },
  state:  { type: String, enum: ['on', 'off'], required: true },
  source: { type: String, enum: ['web', 'device'], default: 'web' },
  at:     { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('Log', LogSchema);
