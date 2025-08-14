exports.index = async (req, res) => {
  res.render('home/index', { title: 'Dashboard', user: req.session.user });
};
