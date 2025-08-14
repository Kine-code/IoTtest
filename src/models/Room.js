const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  floor:    { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true, index: true },
  code:     { type: String, required: true, trim: true }, // VD: P301
  name:     { type: String, trim: true },                 // VD: "Phòng 301"
  capacity: { type: Number, default: 0 },
  isOn:     { type: Boolean, default: false },            // trạng thái đèn/thiết bị chung
}, { timestamps: true });

roomSchema.index({ building: 1, floor: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Room', roomSchema);
