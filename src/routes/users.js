const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { ensureAuth } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roles');

router.use(ensureAuth, ensureRole('admin')); // chỉ admin quản lý tài khoản
router.get('/', ctrl.list);
router.get('/create', ctrl.createForm);
router.post('/create', ctrl.create);
router.get('/:id/edit', ctrl.editForm);
router.post('/:id/edit', ctrl.update);
router.post('/:id/delete', ctrl.remove);

module.exports = router;
