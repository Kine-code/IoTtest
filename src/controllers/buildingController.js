const Building = require('../models/Building');

exports.list = async (req, res) => {
  const items = await Building.find().lean();
  res.render('buildings/list', { title: 'Tòa nhà', items });
};

exports.createForm = (req, res) => res.render('buildings/form', { title: 'Thêm tòa nhà', doc: {}, isEdit: false });

exports.create = async (req, res) => {
  try { await Building.create(req.body); res.redirect('/buildings'); }
  catch (e) { console.error(e); res.render('buildings/form', { title:'Thêm tòa nhà', doc:req.body, isEdit:false, error:'Lỗi tạo'}); }
};

exports.editForm = async (req, res) => {
  const doc = await Building.findById(req.params.id).lean();
  res.render('buildings/form', { title: 'Sửa tòa nhà', doc, isEdit: true });
};

exports.update = async (req, res) => {
  try { await Building.findByIdAndUpdate(req.params.id, req.body); res.redirect('/buildings'); }
  catch (e) { console.error(e); res.redirect('/buildings'); }
};

exports.remove = async (req, res) => { await Building.findByIdAndDelete(req.params.id); res.redirect('/buildings'); };
