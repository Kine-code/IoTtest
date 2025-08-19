const router = require('express').Router();
const ctrl = require('../controllers/roomController');
const { ensureAuth } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roles');
const Device = require('../models/Device');           // <-- THÊM
  
router.use(ensureAuth, ensureRole('admin','staff','viewer'));
async function attachDevicesForRooms(req, res, next) {
  try {
    // Controller list trang này nên set res.locals.rooms = danh sách phòng đang hiển thị
    const rooms = res.locals.rooms || [];
    if (!rooms.length) return next();
    const roomIds = rooms.map(r => r._id);
    const devs = await Device.find({ room: { $in: roomIds } }).lean();

    const map = {};
    for (const d of devs) {
      const k = String(d.room);
      (map[k] ||= []).push(d);
    }
    res.locals.devicesByRoom = map; // để EJS dùng
    next();
  } catch (e) {
    console.error('attachDevicesForRooms error:', e);
    res.locals.devicesByRoom = {};
    next();
  }
}
// router.get('/', ctrl.list, attachDevicesForRooms);
router.get('/', attachDevicesForRooms, ctrl.list);
router.get('/create', ctrl.createForm);
router.post('/create', ctrl.create);
router.get('/:id/edit', ctrl.editForm);
router.post('/:id/edit', ctrl.update);
router.post('/:id/delete', ctrl.remove);
router.post('/:id/off-all', ctrl.offAll);
router.get('/:id/devices', async (req, res) => {
  const devices = await Device.find({ room: req.params.id }).lean();
  res.json(devices);
});

// (Tuỳ chọn) bật/tắt tất cả kênh trong phòng
const axios = require('axios').default;
// Lấy danh sách thiết bị của 1 phòng (để render các công tắc)
router.get('/:id/devices', async (req, res) => {
  const devices = await Device.find({ room: req.params.id }).lean();
  res.json(devices);
});
router.post('/:id/toggle-state', ensureRole('admin','staff'), ctrl.toggleState);
router.post('/:id/toggle-all', ensureRole('admin','staff'), async (req, res) => {
  try {
    const state = req.body.state === 'on' ? 'on' : 'off';
    const devices = await Device.find({ room: req.params.id });
    for (const dev of devices) {
      for (const ch of (dev.channels || [])) {
        try {
          await axios.post(`http://${dev.espIp}/api/control`,
            { led: ch.key, state },
            { headers: { 'Content-Type':'application/json', ...(dev.token?{ 'X-Auth': dev.token }:{} ) }, timeout: 2500 }
          );
          ch.isOn = (state === 'on');
        } catch {}
      }
      dev.status = 'online';
      dev.lastHeartbeat = new Date();
      await dev.save();
    }
    const back = req.body.returnTo || req.get('Referrer') || req.session.lastUrl || '/campuses';
    if (req.is('application/json')) return res.json({ ok: true });
    return res.redirect(back);
  } catch (e) {
    const back = req.body.returnTo || req.get('Referrer') || req.session.lastUrl || '/campuses';
    if (req.is('application/json')) return res.status(500).json({ error: 'toggle-all failed' });
    return res.redirect(back);
  }
});

module.exports = router;
