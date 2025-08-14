require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');

// Connect DB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adminlte_mvc';
mongoose.connect(MONGODB_URI).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
const Menu = require('./models/Menu');
const app = express();
app.use(helmet());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.userRole = req.session.userRole || null;
  next();
});

// Gắn biến dùng chung cho tất cả view
app.use(async (req, res, next) => {
  try {
    // Session -> locals dùng chung
    res.locals.user = req.session.user || null;
    res.locals.userRole = req.session.userRole || null;

    // Helper đánh dấu active theo URL hiện tại (bỏ query)
    const currentPath = req.originalUrl.split('?')[0];
    res.locals.isActive = (href) => {
      if (href === '/') return currentPath === '/';
      return currentPath === href || currentPath.startsWith(href + '/') ? 'active' : '';
    };

    // NẠP MENU THEO ROLE
    const role = req.session.userRole || 'viewer';
    const items = await Menu.find({ visible: true, roles: { $in: [role] } })
                            .sort({ order: 1 }).lean();
    res.locals.menus = items; // <-- QUAN TRỌNG

    next();
  } catch (e) {
    console.error('Load menus error:', e);
    res.locals.menus = []; // fallback an toàn
    next();
  }
});



// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main'); // default layout

// Static
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/users', require('./routes/users'));
app.use('/buildings', require('./routes/buildings'));
app.use('/floors', require('./routes/floors'));
app.use('/rooms', require('./routes/rooms'));
app.use('/devices', require('./routes/devices'));
// 404
app.use((req, res) => res.status(404).render('errors/404', { title: '404 Not Found' }));
// 500
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.locals.layout = 'layouts/main';
  res.status(500).render('errors/500', { title: 'Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
