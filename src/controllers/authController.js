const User = require('../models/User');

exports.getLogin = (req, res) =>
  res.render('auth/login', { title: 'Login', layout: 'layouts/main-auth' });

exports.getRegister = (req, res) =>
  res.render('auth/register', { title: 'Register', layout: 'layouts/main-auth' });

exports.postRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.render('auth/register', { title: 'Register', error: 'Email already in use' });
    const user = await User.create({ name, email, password });
    req.session.userId = user._id;
    req.session.user = { name: user.name, email: user.email };
    res.redirect('/');
  } catch (e) {
    console.error(e);
    res.render('auth/register', { title: 'Register', error: 'Registration failed' });
  }
};


exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.render('auth/login', { title: 'Login', error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.render('auth/login', { title: 'Login', error: 'Invalid credentials' });
    req.session.userRole = user.role; // Store user role in session
    req.session.userId = user._id;
    req.session.user = { name: user.name, email: user.email };
    res.redirect('/');
  } catch (e) {
    console.error(e);
    res.render('auth/login', { title: 'Login', error: 'Login failed' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
};
