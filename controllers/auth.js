const sqlite = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const dbDirectory = path.join(process.cwd(), 'databases/database');
const dbPath = path.join(dbDirectory, 'db.db');

function hashPassword(password, salt) {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  hash.update(salt);
  return hash.digest('hex');
}

const Auth = {
  /** Register new user
   * at api route /auth/register
   * @param {object} req
   * @param {object} res
   * @returns {object} User data from database
   */
  async register(req, res) {
    console.log(req.body);
    const db = new sqlite(dbPath, {
      verbose: console.log,
    });

    let stmt = db.prepare(`
      SELECT
        username
      FROM
        users
      WHERE
        username = ?
    ;`);
    let user = stmt.get(req.body.username);

    console.log(user);

    if (user) {
      return res.status(400).json({
        message: 'User with this username already exists.',
        // response: {
        //   username: userGet.username,
        //   id: userGet.id,
        // },
      });
    }

    stmt = db.prepare(`
      SELECT
        email
      FROM
        users
      WHERE
        email = ?
    ;`);
    user = stmt.get(req.body.email);

    console.log(user);

    if (user) {
      return res.status(400).json({
        message: 'User with this email already exists.',
      });
    }

    const salt = crypto.randomBytes(256).toString('hex');
    const hash = hashPassword(req.body.password, salt);
    // Create an User object with escaped and trimmed data with hashed password.
    user = {
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hash,
      salt,
      joinDT: new Date().getTime(),
    };

    console.log(user);
    const insert = db.prepare(`
      INSERT INTO
        users (username, firstName, lastName, email, password, salt, joinDT) 
      VALUES 
        (@username, @firstName, @lastName, @email, @password, @salt, @joinDT)
    ;`);

    insert.run(user);

    stmt = db.prepare(`
      SELECT
        id, username, email
      FROM
        users
      WHERE
        username = ?`);
    const userGet = stmt.get(user.username);

    if (userGet) {
      // Successful - redirect to new book record.
      return res.status(201).json({
        message: 'User created successfully.',
        response: {
          username: userGet.username,
          email: userGet.email,
          token: userGet.id,
        },
      });
    } else {
      return res.render('signup', {
        user,
        errors: [
          {
            value: '',
            msg: 'An error has occured. Please try again',
            param: '',
            location: 'body',
          },
        ],
      });
    }
  },
};

module.exports = Auth;
