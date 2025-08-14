const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
  campus: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
  name:   { type: String, required: true, trim: true },         // BN1, Polyco, ...
  code:   { type: String, required: true, trim: true },         // dùng cho slug nếu muốn
  note:   { type: String, trim: true }
}, { timestamps: true });

buildingSchema.index({ campus: 1, code: 1 }, { unique: true });
module.exports = mongoose.model('Building', buildingSchema);
