// src/middleware/auth.js
module.exports.ensureAuth = (req, res, next) => {
  const userId = req.session && req.session.userId;
  if (userId) return next();

  // Nếu là request XHR/API thì trả 401 JSON
  if (req.xhr || (req.headers.accept || '').includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Còn lại redirect về login
  return res.redirect('/auth/login');
};

module.exports.ensureGuest = (req, res, next) => {
  const userId = req.session && req.session.userId;
  if (!userId) return next();
  return res.redirect('/');
};
