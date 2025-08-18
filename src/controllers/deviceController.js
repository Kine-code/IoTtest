// src/controllers/deviceController.js
const axios  = require('axios').default;
const Device = require('../models/Device');
const Room   = require('../models/Room');
const Log    = require('../models/Log');

// List thiết bị
exports.list = async (req, res) => {
  try {
    const devices = await Device.find({})
      .populate('room', 'code name')
      .lean();
    res.render('devices/list', { title: 'Thiết bị', devices }); // <-- truyền devices
  } catch (e) {
    console.error('devices.list error:', e);
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
};

// Form tạo
exports.createForm = async (req, res) => {
  try {
    const RoomModel = require('../models/Room');
    const rooms = await RoomModel.find().sort({ code: 1 }).lean();
    res.render('devices/form', { title: 'Thêm thiết bị', isEdit: false, doc: {}, rooms });
  } catch (e) {
    console.error('devices.createForm error:', e);
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
};

// Tạo
exports.create = async (req, res) => {
  try {
    const body = req.body;
    // Nếu không có channels, tạo mặc định 2 kênh
    if (!body.channels || !Array.isArray(body.channels) || body.channels.length === 0) {
      body.channels = [
        { key: 'LED1', label: 'Kênh 1', isOn: false },
        { key: 'LED2', label: 'Kênh 2', isOn: false },
      ];
    }
    const dev = new Device(body);
    await dev.save();
    res.redirect('/devices');
  } catch (e) {
    console.error('devices.create error:', e);
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
};

// Form sửa
exports.editForm = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await Device.findById(id).lean();
    if (!doc) return res.status(404).render('errors/404', { title: 'Not Found' });

    const RoomModel = require('../models/Room');
    const rooms = await RoomModel.find().sort({ code: 1 }).lean();
    res.render('devices/form', { title: 'Sửa thiết bị', isEdit: true, doc, rooms });
  } catch (e) {
    console.error('devices.editForm error:', e);
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
};

// Cập nhật
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    await Device.findByIdAndUpdate(id, req.body, { runValidators: true });
    res.redirect('/devices');
  } catch (e) {
    console.error('devices.update error:', e);
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
};

// Xóa
exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    await Device.findByIdAndDelete(id);
    res.redirect('/devices');
  } catch (e) {
    console.error('devices.remove error:', e);
    res.status(500).render('errors/500', { title: 'Server Error' });
  }
};

// Bật/tắt từ Admin (gọi đúng API của ESP: POST /api/control)
exports.toggle = async (req, res) => {
  try {
    const { id } = req.params;
    const { key, state, returnTo } = req.body; // key 'LED1'|'LED2', state 'on'|'off'

    const dev = await Device.findById(id);
    if (!dev) return res.redirect(returnTo || req.get('Referrer') || '/devices');

    const headers = { 'Content-Type': 'application/json' };
    if (dev.token) headers['X-Auth'] = String(dev.token);

    // Gửi lệnh tới ESP
    if (dev.espIp) {
      try {
        await axios.post(`http://${dev.espIp}/api/control`,
          { led: key, state }, 
          { headers: { 'X-Auth': dev.token, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('ESP call failed:', err.message);
        // vẫn cập nhật DB để UI phản ánh
      }
    }

    // Cập nhật nhanh DB
    const ch = (dev.channels || []).find(c => c.key === key);
    if (ch) ch.isOn = (state === 'on');
    dev.status = 'online';
    dev.lastHeartbeat = new Date();
    await dev.save();

    // Ghi log
    try {
      await Log.create({ device: dev._id, room: dev.room, led: key, state, source: 'web' });
    } catch {}

    // Bắn realtime (nếu có)
    req.app.get('io')?.emit('device:channel', { deviceId: dev._id, key, isOn: ch?.isOn });

    return res.redirect(returnTo || req.get('Referrer') || '/devices');
  } catch (e) {
    console.error('Device toggle error:', e.message);
    return res.redirect(req.body?.returnTo || req.get('Referrer') || '/devices');
  }
};

// ESP đẩy trạng thái về server (BTN ngoài)
exports.ingestState = async (req, res) => {
  try {
    const headerToken = req.get('X-Auth') || (req.get('Authorization')||'').replace(/^Bearer\s+/,'');
    const { roomCode, channels = {}, token, ip } = req.body || {};

    // tìm device: ưu tiên token, thiếu thì roomCode
    let dev = null;
    if (headerToken || token) dev = await Device.findOne({ token: headerToken || token });
    if (!dev && roomCode)    dev = await Device.findOne({ roomCode });
    if (!dev) return res.status(404).json({ ok: false, error: 'device_not_found' });

    if (ip) dev.espIp = ip;

    // cập nhật trạng thái kênh
    const m = dev.channels.reduce((acc, c) => (acc[c.key] = c, acc), {});
    Object.keys(channels).forEach(k => {
      if (m[k]) m[k].isOn = !!channels[k];
    });

    dev.status = 'online';
    dev.lastHeartbeat = new Date();
    await dev.save();

    // (tuỳ chọn) cập nhật Room.isOn theo OR của các kênh
    try {
      const anyOn = dev.channels.some(c => c.isOn);
      await Room.updateOne({ _id: dev.room }, { $set: { isOn: anyOn } });
    } catch {}

    // realtime
    Object.keys(channels).forEach(k => {
      req.app.get('io')?.emit('device:channel', { deviceId: dev._id, key: k, isOn: !!channels[k] });
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error('ingestState error:', e);
    return res.status(500).json({ ok: false });
  }
};
