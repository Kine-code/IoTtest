require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const morgan = require('morgan');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');
const http = require('http');
const { Server } = require('socket.io');

const Menu = require('./models/Menu');

const app = express(); // <-- tạo app TRƯỚC

// Kết nối DB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adminlte_mvc';
mongoose.connect(MONGODB_URI).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

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
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// locals + menus
app.use(async (req, res, next) => {
  try {
    res.locals.user = req.session.user || null;
    res.locals.userRole = req.session.userRole || null;

    let currentPath = (req.originalUrl.split('?')[0] || '/').replace(/\/+$/, '');
    res.locals.isActive = (href = '/') => {
      let h = href.replace(/\/+$/, '');
      if (h === '/') return (currentPath === '/' || currentPath === '') ? 'active' : '';
      return (currentPath === h || currentPath.startsWith(h + '/')) ? 'active' : '';
    };

    const role = req.session.userRole || 'viewer';
    res.locals.menus = await Menu.find({ visible: true, roles: { $in: [role] } })
                                 .sort({ order: 1 }).lean();
    next();
  } catch (e) {
    console.error('Load menus error:', e);
    res.locals.menus = [];
    next();
  }
});
app.use((req, res, next) => {
  res.locals.currentUrl = req.originalUrl.split('#')[0];
  if (req.method === 'GET') {
    req.session.lastUrl = res.locals.currentUrl; // fallback nếu form không gửi returnTo
  }
  next();
});
// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Static
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/campuses', require('./routes/campuses'));
app.use('/users', require('./routes/users'));
app.use('/buildings', require('./routes/buildings'));
app.use('/floors', require('./routes/floors'));
app.use('/rooms', require('./routes/rooms'));
app.use('/devices', require('./routes/devices'));
app.use('/api', require('./routes/logs'));

// 404 & 500
app.use((req, res) => res.status(404).render('errors/404', { title: '404 Not Found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.locals.layout = 'layouts/main';
  res.status(500).render('errors/500', { title: 'Server Error' });
});

// --- Socket.IO (đặt SAU khi đã có app) ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

// Lắng nghe
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
