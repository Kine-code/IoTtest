const mongoose = require('mongoose');
const Counter  = require('./Counter');
const Floor    = require('./Floor');
const Building = require('./Building');

const roomSchema = new mongoose.Schema({
  building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
  floor:    { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true, index: true },
  code:     { type: String, required: true, trim: true }, // sẽ được auto-fill nếu chưa có
  name:     { type: String, trim: true },
  capacity: { type: Number, default: 0 },
  isOn:     { type: Boolean, default: false },
}, { timestamps: true });

roomSchema.index({ building: 1, floor: 1, code: 1 }, { unique: true });

// ---- AUTO-GEN CODE: <level><seq>  => 101, 102, 201, ...
roomSchema.pre('validate', async function(next) {
  try {
    if (this.code && this.code.trim()) return next();

    // lấy thông tin tầng (cần field level trong Floor)
    const floorDoc = await Floor.findById(this.floor).lean();
    if (!floorDoc) return next(new Error('Floor not found'));
    const level = floorDoc.level; // ví dụ: 1,2,3,...

    // counter theo từng tầng
    const key = `floor:${String(this.floor)}`;
    const counter = await Counter.findOneAndUpdate(
      { key },
      { $inc: { value: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const seq = String(counter.value).padStart(2, '0'); // 01, 02, ...
    // -> mã phòng: 101, 102, 201, 202...
    this.code = `P${level}${seq}`;

    // Nếu muốn dạng kèm mã toà: BN1-101, BN1-102, thay bằng:
    // const buildingDoc = await Building.findById(this.building).lean();
    // this.code = `${buildingDoc.code}-${level}${seq}`;

    if (!this.name) this.name = `Phòng ${this.code}`;
    return next();
  } catch (err) {
    return next(err);
  }
});

module.exports = mongoose.model('Room', roomSchema);
