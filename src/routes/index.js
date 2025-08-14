const router = require('express').Router();
const home = require('../controllers/homeController');
const { ensureAuth } = require('../middleware/auth');

router.use((req, res, next) => { res.locals.activeMenu = 'dashboard'; next(); });
router.get('/', ensureAuth, home.index);

module.exports = router;
