const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
  building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  level: { type: Number, required: true }, // tầng số mấy
  name: { type: String, trim: true },      // VD: "Tầng 3"
}, { timestamps: true });

floorSchema.index({ building: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('Floor', floorSchema);
