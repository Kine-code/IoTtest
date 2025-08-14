const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, required: true, trim: true, unique: true }, // VD: GD2.1
  address: { type: String, trim: true },
  note: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Building', buildingSchema);
