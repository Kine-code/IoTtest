const Floor = require('../models/Floor');
const Building = require('../models/Building');

exports.list = async (req, res) => {
  const buildingId = req.query.building;
  const buildings = await Building.find().lean();
  const query = buildingId ? { building: buildingId } : {};
  const items = await Floor.find(query).populate('building').lean();
  res.render('floors/list', { title: 'Tầng', items, buildings, buildingId });
};

exports.createForm = async (req, res) => {
  const buildings = await Building.find().lean();
  res.render('floors/form', { title: 'Thêm tầng', doc: {}, buildings, isEdit: false });
};

exports.create = async (req, res) => {
  try { await Floor.create(req.body); res.redirect('/floors'); }
  catch (e) { console.error(e); res.redirect('/floors'); }
};

exports.editForm = async (req, res) => {
  const [doc, buildings] = await Promise.all([
    Floor.findById(req.params.id).lean(),
    Building.find().lean()
  ]);
  res.render('floors/form', { title: 'Sửa tầng', doc, buildings, isEdit: true });
};

exports.update = async (req, res) => { await Floor.findByIdAndUpdate(req.params.id, req.body); res.redirect('/floors'); };
exports.remove = async (req, res) => { await Floor.findByIdAndDelete(req.params.id); res.redirect('/floors'); };
