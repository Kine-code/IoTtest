const router = require('express').Router();
const auth = require('../controllers/authController');
const { ensureGuest } = require('../middleware/auth');

router.get('/login', ensureGuest, auth.getLogin);
router.post('/login', ensureGuest, auth.postLogin);
router.get('/register', ensureGuest, auth.getRegister);
router.post('/register', ensureGuest, auth.postRegister);
router.post('/logout', auth.logout);

module.exports = router;
