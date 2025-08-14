const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  title:   { type: String, required: true, trim: true },          // Tài khoản, Tòa nhà...
  path:    { type: String, required: true, trim: true },          // "/users", "/buildings", ...
  icon:    { type: String, default: 'bi bi-circle' },             // class icon Bootstrap Icons
  order:   { type: Number, default: 0, index: true },             // sắp xếp
  parent:  { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', default: null }, // null = menu cấp 1
  roles:   { type: [String], default: ['admin','staff','viewer'] }, // ai được thấy
  activeMatch: { type: String, default: '' },                     // pattern active tùy biến (nếu cần)
  visible: { type: Boolean, default: true },                      // ẩn/hiện
}, { timestamps: true });

menuSchema.index({ path: 1 }, { unique: true });

module.exports = mongoose.model('Menu', menuSchema);
