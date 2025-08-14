const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true }, // Bắc Ninh, Hà Nội
  code: { type: String, required: true, trim: true, unique: true },  // BN, HN
  address: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Campus', campusSchema);
