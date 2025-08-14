module.exports.ensureAuth = (req, res, next) => {
  if (req.session.userId) return next();
  return res.redirect('/auth/login');
};

module.exports.ensureGuest = (req, res, next) => {
  if (!req.session.userId) return next();
  return res.redirect('/');
};
