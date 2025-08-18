const router = require('express').Router();
const ctrl = require('../controllers/deviceController');
const { ensureAuth } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roles');
const Device = require('../models/Device');
const Log    = require('../models/Log');

// Webhook: ESP32 báo trạng thái hiện tại
router.post('/state', async (req, res) => {
  try {
    // Xác thực bằng token của Device: header X-Auth hoặc Authorization Bearer
    const tokenHeader = req.get('X-Auth') || (req.get('Authorization') || '').replace(/^Bearer\s+/,'') || '';
    const { roomCode, channels, ip } = req.body || {};

    // Tìm device: ưu tiên theo token, fallback theo roomCode
    let dev = null;
    if (tokenHeader) dev = await Device.findOne({ token: tokenHeader });
    if (!dev && roomCode) dev = await Device.findOne({ roomCode });

    if (!dev) return res.status(404).json({ error: 'Device not found' });

    // Ghi nhận IP mới nếu có
    if (ip) dev.espIp = ip;

    if (channels) {
      // Cập nhật trạng thái từng kênh và log lại thay đổi
      for (const ch of dev.channels) {
        if (Object.prototype.hasOwnProperty.call(channels, ch.key)) {
          const newOn = !!channels[ch.key];
          if (ch.isOn !== newOn) {
            ch.isOn = newOn;
            await Log.create({
              device: dev._id,
              room: dev.room,
              led: ch.key,
              state: newOn ? 'on' : 'off',
              source: 'device',
            });
          }
          // phát realtime nếu bạn có socket.io (tùy chọn)
          req.app.get('io')?.emit('device:channel', {
            deviceId: dev._id, room: dev.room, key: ch.key, isOn: ch.isOn
          });
        }
      }
    }

    dev.status = 'online';
    dev.lastHeartbeat = new Date();
    await dev.save();

    return res.json({ ok: true });
  } catch (e) {
    console.error('state webhook error', e);
    return res.status(500).json({ error: 'failed' });
  }
});

router.use(ensureAuth, ensureRole('admin','staff','viewer'));

router.get('/', ctrl.list);
router.get('/create', ensureRole('admin','staff'), ctrl.createForm);
router.post('/create', ensureRole('admin','staff'), ctrl.create);
router.get('/:id/edit', ensureRole('admin','staff'), ctrl.editForm);
router.post('/:id/edit', ensureRole('admin','staff'), ctrl.update);
router.post('/:id/delete', ensureRole('admin'), ctrl.remove);

// // API bật/tắt kênh
router.post('/:id/toggle', ctrl.toggle);

module.exports = router;
