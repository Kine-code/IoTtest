const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true }, // ví dụ: floor:<floorId>
  value: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Counter', counterSchema);
