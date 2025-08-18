const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roles');
const Log = require('../models/Log');

router.use(ensureAuth, ensureRole('admin','staff','viewer'));

router.get('/logs', async (req, res) => {
  const q = {};
  if (req.query.device) q.device = req.query.device;
  if (req.query.room)   q.room   = req.query.room;
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const rows = await Log.find(q).sort({ at: -1 }).limit(limit).lean();
  res.json(rows);
});

module.exports = router;
