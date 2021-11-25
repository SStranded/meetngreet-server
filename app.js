const express = require('express');
const morgan = require('morgan');
const path = require('path');
const sqlite = require('better-sqlite3');
const session = require('express-session');
const SqliteStoreFactory = require('better-sqlite3-session-store');
const SqliteStore = SqliteStoreFactory(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');
const restrictOrigin = require('./middlewares/restrictOrigin');
require('dotenv').config(); // Require the dotenv

// Database configuration
const dbDirectory = path.join(process.cwd(), 'databases');
const sessionsDbPath = path.join(dbDirectory, 'sessions');
const db = new sqlite(path.join(sessionsDbPath, 'sessions.db'), {
  // verbose: console.log,
});

function hashPassword(password, salt) {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  hash.update(salt);
  return hash.digest('hex');
}

passport.use(
  new LocalStrategy((username, password, done) => {
    let stmt = db.prepare(`SELECT salt FROM users WHERE username = ?`);
    const userSalt = stmt.get(username);
    if (!userSalt) return done(null, false);
    const hash = hashPassword(password, userSalt.salt);

    stmt = db.prepare(
      `SELECT id, username FROM users WHERE username = ? AND password = ?`,
    );
    const user = stmt.get(username, hash);
    if (!user) return done(null, false);
    return done(null, user);
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const stmt = db.prepare(`SELECT id, username FROM users WHERE id = ?`);
  const userInfo = stmt.get(id);
  if (!userInfo) return done(null, false);
  return done(null, userInfo);
});

const app = express(); //Create new instance

app.use(
  session({
    store: new SqliteStore({
      client: db,
      expired: {
        clear: true,
        intervalMs: 900000, //ms = 15min
      },
    }),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use(cors());
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept',
  );
  next();
});

app.use(restrictOrigin);
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); //allows us to access request body as req.body
app.use(morgan('dev')); //enable incoming request logging in dev mode

const postRouter = require('./routes/posts.routes.js');
app.use('/post', postRouter);

//Define the endpoint
app.get('/ping', (req, res) => {
  return res.send({
    status: 'Healthy',
  });
});

const PORT = process.env.PORT || 5000; //Declare the port number

app.listen(PORT, () => {
  console.log('Server started listening on port : ', PORT);
});
