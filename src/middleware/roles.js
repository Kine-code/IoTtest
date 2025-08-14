exports.ensureRole = (...roles) => (req, res, next) => {
  const role = req.session?.userRole;
  if (roles.includes(role)) return next();

  // Dùng layout chính của app (không phải layout auth)
  res.locals.layout = 'layouts/main';
  return res.status(403).render('errors/403', { title: 'Forbidden' });
};
