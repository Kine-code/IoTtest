const router = require('express').Router();
const ctrl = require('../controllers/campusController');
const { ensureAuth } = require('../middleware/auth');
const { ensureRole } = require('../middleware/roles');

router.use(ensureAuth, ensureRole('admin','staff','viewer'));

router.get('/', ctrl.listCampuses); // /campuses
router.get('/:campusId/buildings', ctrl.listBuildings); // /campuses/:campusId/buildings
router.get('/:campusId/buildings/:buildingId/floors', ctrl.listFloors);
router.get('/:campusId/buildings/:buildingId/floors/:floorId/rooms', ctrl.listRooms);

module.exports = router;
