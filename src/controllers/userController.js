const User = require('../models/User');

exports.list = async (req, res) => {
  const users = await User.find().select('-password').lean();
  res.render('users/list', { title: 'Quản lý tài khoản', users, user: req.session.user });
};

exports.createForm = (req, res) => {
  res.render('users/form', { title: 'Tạo tài khoản', userDoc: {}, isEdit: false });
};

exports.create = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    await User.create({ name, email, password, role });
    res.redirect('/users');
  } catch (e) {
    console.error(e);
    res.render('users/form', { title: 'Tạo tài khoản', error: 'Không tạo được', userDoc: req.body, isEdit: false });
  }
};

exports.editForm = async (req, res) => {
  const userDoc = await User.findById(req.params.id).select('-password').lean();
  if (!userDoc) return res.redirect('/users');
  res.render('users/form', { title: 'Sửa tài khoản', userDoc, isEdit: true });
};

exports.update = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect('/users');
    user.name = name; user.email = email; user.role = role;
    if (password) user.password = password; // sẽ được hash ở pre('save')
    await user.save();
    res.redirect('/users');
  } catch (e) {
    console.error(e);
    res.redirect('/users');
  }
};

exports.remove = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/users');
};
