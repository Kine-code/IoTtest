const Campus = require('../models/Campus');
const Building = require('../models/Building');
const Floor = require('../models/Floor');
const Room = require('../models/Room');

// GET /campuses
exports.listCampuses = async (req, res) => {
  const campuses = await Campus.find().sort({ name: 1 }).lean();
  res.render('campuses/campuses', { title: 'Quản lý cơ sở', campuses });
};

// GET /campuses/:campusId/buildings
exports.listBuildings = async (req, res) => {
  const campus = await Campus.findById(req.params.campusId).lean();
  if (!campus) return res.redirect('/campuses');
  const buildings = await Building.find({ campus: campus._id }).sort({ name: 1 }).lean();
  res.render('campuses/buildings', { title: `Cơ sở: ${campus.name}`, campus, buildings });
};

// GET /campuses/:campusId/buildings/:buildingId/floors
exports.listFloors = async (req, res) => {
  const campus = await Campus.findById(req.params.campusId).lean();
  const building = await Building.findById(req.params.buildingId).lean();
  if (!campus || !building) return res.redirect('/campuses');
  const floors = await Floor.find({ building: building._id }).sort({ level: 1 }).lean();
  res.render('campuses/floors', {
    title: `${campus.name} / ${building.name}`, campus, building, floors
  });
};

// GET /campuses/:campusId/buildings/:buildingId/floors/:floorId/rooms
exports.listRooms = async (req, res) => {
  const campus = await Campus.findById(req.params.campusId).lean();
  const building = await Building.findById(req.params.buildingId).lean();
  const floor = await Floor.findById(req.params.floorId).lean();
  if (!campus || !building || !floor) return res.redirect('/campuses');
  const rooms = await Room.find({ floor: floor._id }).sort({ code: 1 }).lean();
  res.render('campuses/rooms', {
    title: `${campus.name} / ${building.name} / Tầng ${floor.level}`,
    campus, building, floor, rooms
  });
};
