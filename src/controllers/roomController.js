const Room = require('../models/Room');
const Floor = require('../models/Floor');
const Building = require('../models/Building');
const Device   = require('../models/Device');
const Campus   = require('../models/Campus'); 
exports.list = async (req, res) => {
  try {
    const { campusId, buildingId, floorId } = req.params;

    const [campus, building, floor] = await Promise.all([
      Campus.findById(campusId).lean(),
      Building.findById(buildingId).lean(),
      Floor.findById(floorId).lean(),
    ]);
    if (!campus || !building || !floor) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }

    const rooms = await Room.find({ floor: floor._id }).sort({ code: 1 }).lean();

    const roomIds = rooms.map(r => r._id);
    const devices = await Device.find({ room: { $in: roomIds } })
      .select('_id name espIp room channels token')
      .lean();

    const devicesByRoom = {};
    for (const d of devices) {
      const k = String(d.room);
      (devicesByRoom[k] ||= []).push(d);
    }

    return res.render('campuses/rooms', {
      title: `Phòng tầng ${floor.level}`,
      campus, building, floor,
      rooms,
      devicesByRoom,
      currentUrl: req.originalUrl
    });
  } catch (e) {
    console.error('rooms.list error:', e);
    return res.status(500).render('errors/500', { title: 'Server Error' });
  }
};

// -> GET /rooms/create?building=<bid>&floor=<fid>&returnTo=/campuses/<cid>/buildings/<bid>/floors/<fid>/rooms
exports.createForm = async (req, res) => {
  const { building, floor, returnTo } = req.query;
  const [b, f] = await Promise.all([
    Building.findById(building).lean(),
    Floor.findById(floor).lean()
  ]);
  if (!b || !f) return res.redirect(returnTo || '/campuses');
  res.render('rooms/form', {
    title: 'Thêm phòng',
    isEdit: false,
    doc: { building: b._id, floor: f._id },
    returnTo
  });
};

exports.create = async (req, res) => {
  try {
    const { building, floor, name, capacity, returnTo } = req.body;
    const doc = await Room.create({ building, floor, name, capacity: Number(capacity || 0) });
    req.app.get('io')?.emit('room:created', doc); // phát sự kiện realtime
    res.redirect(returnTo || '/rooms');
  } catch (e) {
    console.error('Room create error:', e);
    res.redirect(req.body.returnTo || '/rooms');
  }
};

exports.editForm = async (req, res) => {
  const { returnTo } = req.query;
  const doc = await Room.findById(req.params.id).lean();
  if (!doc) return res.redirect(returnTo || '/campuses');
  res.render('rooms/form', { title: 'Sửa phòng', isEdit: true, doc, returnTo });
};

exports.update = async (req, res) => {
  try {
    const { code, name, capacity, returnTo } = req.body;
    const doc = await Room.findByIdAndUpdate(req.params.id, { code, name, capacity: Number(capacity||0) }, { new: true });
    req.app.get('io')?.emit('room:updated', doc);
    res.redirect(returnTo || '/rooms');
  } catch (e) {
    console.error(e);
    res.redirect(req.body.returnTo || '/rooms');
  }
};


exports.remove = async (req, res) => {
  try {
    const { returnTo } = req.body;
    const doc = await Room.findByIdAndDelete(req.params.id);
    req.app.get('io')?.emit('room:deleted', { _id: doc._id });
    res.redirect(returnTo || '/rooms');
  } catch (e) {
    console.error(e);
    res.redirect(req.body.returnTo || '/rooms');
  }
};

exports.toggleState = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (room) {
      const desired = ['true', 'on', '1'].includes(String(req.body.state).toLowerCase());
      room.isOn = desired;
      await room.save();
      req.app.get('io')?.emit('room:state', { _id: room._id, isOn: room.isOn });
    }
  } catch (e) {
    console.error('toggleState error:', e);
  }
  const back = req.body.returnTo || req.get('Referrer') || req.session.lastUrl || '/campuses';
  return res.redirect(back);
};