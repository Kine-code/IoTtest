// src/controllers/homeController.js
const dayjs  = require('dayjs');
const Room   = require('../models/Room');
const Device = require('../models/Device');
const Log    = require('../models/Log'); // {device, room, led, state:'on'|'off', at:Date}

/** Nhãn 7 ngày gần nhất (DD/MM) */
function last7DaysLabels() {
  const labels = [];
  for (let i = 6; i >= 0; i--) labels.push(dayjs().subtract(i, 'day').format('DD/MM'));
  return labels;
}

/** Tính tổng số phút bật theo ngày từ log trong 7 ngày gần nhất */
async function usageMinutesLast7Days() {
  const from = dayjs().startOf('day').subtract(6, 'day').toDate();
  const to   = new Date();

  const logs = await Log.find({
    at: { $gte: from, $lte: to },
    state: { $in: ['on', 'off'] }
  }).sort({ at: 1 }).lean();

  const open = new Map();             // key: `${device}|${led}` -> Date(on)
  const perDay = {};
  last7DaysLabels().forEach(l => (perDay[l] = 0));

  const pushMinutes = (start, end) => {
    const minutes = Math.max(0, Math.round((end - start) / 60000));
    const label = dayjs(start).format('DD/MM');
    if (perDay[label] != null) perDay[label] += minutes;
  };

  for (const lg of logs) {
    const key = `${lg.device}|${lg.led}`;
    if (lg.state === 'on') {
      open.set(key, lg.at);
    } else if (lg.state === 'off') {
      if (open.has(key)) {
        pushMinutes(open.get(key), lg.at);
        open.delete(key);
      }
    }
  }
  // kênh vẫn đang bật tới hiện tại
  const now = new Date();
  for (const [, startedAt] of open) pushMinutes(startedAt, now);

  return {
    labels: Object.keys(perDay),
    minutes: Object.keys(perDay).map(k => perDay[k]),
  };
}

exports.index = async (req, res) => {
  try {
    // KPI
    const [roomsTotal, devicesOnline, activeRoomsRaw, onToday] = await Promise.all([
      Room.countDocuments({}),
      Device.countDocuments({ status: 'online' }),
      // populate để dựng link chính xác
      Room.find({ isOn: true })
        .populate({ path: 'building', select: '_id campus' })
        .populate({ path: 'floor',    select: '_id level'  })
        .sort({ code: 1 })
        .lean(),
      Log.countDocuments({
        state: 'on',
        at: { $gte: dayjs().startOf('day').toDate(), $lte: dayjs().endOf('day').toDate() }
      })
    ]);

    // Chuẩn hóa “Bật từ” + dựng link tới trang phòng
    const activeRooms = activeRoomsRaw.map(r => {
      const lastOnAt = r.lastOnAt || r.updatedAt || r.createdAt;
      // Mặc định fallback (nếu thiếu ref)
      let link = `/rooms/${r._id}/edit`;
      if (r.building?._id && r.building?.campus && r.floor?._id) {
        link = `/campuses/${r.building.campus}/buildings/${r.building._id}/floors/${r.floor._id}/rooms`;
      }
      return { ...r, lastOnAt, __link: link };
    });

    // Biểu đồ 7 ngày
    const chartData = await usageMinutesLast7Days();

    // Link “Chi tiết” của small-box (tới phòng đầu tiên đang bật)
    const firstActiveLink = activeRooms[0]?.__link || '/campuses';

    return res.render('home/index', {
      title: 'Dashboard',
      stat: {
        activeCount: activeRooms.length,
        devicesOnline,
        onToday,
        roomsTotal,
      },
      chartData,
      activeRooms,
      firstActiveLink,             // dùng cho nút “Chi tiết” ở small-box
      currentUrl: req.originalUrl, // để form post quay lại đúng trang
    });
  } catch (e) {
    console.error('home.index error:', e);
    return res.status(500).render('errors/500', { title: 'Server Error' });
  }
};
