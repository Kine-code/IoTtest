const Device = require('../models/Device');
const Room = require('../models/Room');

exports.list = async (req, res) => {
  const room = req.query.room;
  const rooms = await Room.find().lean();
  const q = room ? { room } : {};
  const devices = await Device.find(q).populate({ path:'room', populate:['building','floor'] }).lean();
  res.render('devices/list', { title: 'Thiết bị', devices, rooms, room });
};

exports.createForm = async (req, res) => {
  const rooms = await Room.find().lean();
  res.render('devices/form', { title: 'Thêm thiết bị', doc: {}, rooms, isEdit:false });
};

exports.create = async (req, res) => { try { await Device.create(req.body); res.redirect('/devices'); } catch(e){ console.error(e); res.redirect('/devices'); } };

exports.editForm = async (req, res) => {
  const [doc, rooms] = await Promise.all([ Device.findById(req.params.id).lean(), Room.find().lean() ]);
  res.render('devices/form', { title: 'Sửa thiết bị', doc, rooms, isEdit:true });
};

exports.update = async (req, res) => { await Device.findByIdAndUpdate(req.params.id, req.body); res.redirect('/devices'); };
exports.remove = async (req, res) => { await Device.findByIdAndDelete(req.params.id); res.redirect('/devices'); };
