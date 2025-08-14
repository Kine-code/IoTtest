const Room = require('../models/Room');
const Floor = require('../models/Floor');
const Building = require('../models/Building');

exports.list = async (req, res) => {
  const { building, floor } = req.query;
  const buildings = await Building.find().lean();
  const floors = floor ? await Floor.find({ building }).lean() : [];
  const q = {};
  if (building) q.building = building;
  if (floor) q.floor = floor;
  const rooms = await Room.find(q).populate('building floor').lean();
  res.render('rooms/list', { title: 'Phòng học', rooms, buildings, floors, building, floor });
};

exports.createForm = async (req, res) => {
  const buildings = await Building.find().lean();
  res.render('rooms/form', { title: 'Thêm phòng', doc: {}, buildings, floors: [], isEdit: false });
};

exports.create = async (req, res) => { try { await Room.create(req.body); res.redirect('/rooms'); } catch (e) { console.error(e); res.redirect('/rooms'); } };

exports.editForm = async (req, res) => {
  const doc = await Room.findById(req.params.id).lean();
  const buildings = await Building.find().lean();
  const floors = await Floor.find({ building: doc.building }).lean();
  res.render('rooms/form', { title: 'Sửa phòng', doc, buildings, floors, isEdit: true });
};

exports.update = async (req, res) => { await Room.findByIdAndUpdate(req.params.id, req.body); res.redirect('/rooms'); };
exports.remove = async (req, res) => { await Room.findByIdAndDelete(req.params.id); res.redirect('/rooms'); };
