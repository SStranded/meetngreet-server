const sqlite = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDirectory = path.join(process.cwd(), 'databases/database');
const dbPath = path.join(dbDirectory, 'db.db');

const Posts = {
  /** Reset posts table in database
   * at api route /post/reset
   * @param {object} req
   * @param {object} res
   * @returns {object} Set data from database
   */
  async reset(req, res) {
    const db = new sqlite(dbPath, {
      verbose: console.log,
    });
    let stmt = db.prepare(`
      DROP TABLE IF EXISTS posts
    ;`);
    stmt.run();
    stmt = db.prepare(`
      CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      dt INTEGER NOT NULL,
      isLiked INTEGER NOT NULL,
      likeCount INTEGER NOT NULL,
      commentCount INTEGER NOT NULL
    );`);

    stmt.run();

    db.close();

    res.status(200).send('database');
  },

  /** Fills posts table in database with test data
   * at api route /post/fakefill
   * @param {object} req
   * @param {object} res
   * @returns {object} Set data from database
   */
  async fakefill(req, res) {
    const db = new sqlite(dbPath, {
      verbose: console.log,
    });

    const fakeData = fs
      .readFileSync(path.join(dbDirectory, 'posts/fakeposts.sql'))
      .toString();

    db.exec(fakeData);

    db.close();

    res.status(200).send('database');
  },

  /** Get all posts from database
   * at api route /post/getPosts
   * @param {object} req
   * @param {object} res
   * @returns {object} All posts data from database
   */
  async getPosts(req, res) {
    const db = new sqlite(dbPath, {
      verbose: console.log,
    });

    const stmt = db.prepare(`
      SELECT * FROM posts LIMIT 2;
    `);
    const posts = stmt.all();
    return res.status(200).json(posts);
  },

  /** Get a single set from database
   * at api route /databaseapi/getoneset/:id
   * @param {object} req
   * @param {object} res
   * @returns {object} Set data from database
   */
  async newPost(req, res) {
    const queryResult = await query('set', req.params.id);
    return res.status(queryResult.status).send(queryResult.data);
  },

  /** Get a single set from database
   * at api route /databaseapi/getoneset/:id
   * @param {object} req
   * @param {object} res
   * @returns {object} Set data from database
   */
  async getOneSet(req, res) {
    const queryResult = await query('set', req.params.id);
    return res.status(queryResult.status).send(queryResult.data);
  },

  /** Get one color from the database
   * at api route /databaseapi/getonecolor/:id
   * @param {object} req
   * @param {object} res
   * @returns {object} Color data from database
   */
  async getOneColor(req, res) {
    const queryResult = await query('color', req.params.id);
    return res.status(queryResult.status).send(queryResult.data);
  },

  /** Get one minifig from the database
   * at api route /databaseapi/getoneminifig/:id
   * @param {object} req
   * @param {object} res
   * @returns {object} Minifig data from database
   */
  async getOneMinifig(req, res) {
    const queryResult = await query('minifig', req.params.id);
    return res.status(queryResult.status).send(queryResult.data);
  },

  /** Get one part from the database
   * at api route /databaseapi/getonepart/:id
   * @param {object} req
   * @param {object} res
   * @returns {object} Part data from database
   */
  async getOnePart(req, res) {
    const queryResult = await query('parts', req.params.id);
    return res.status(queryResult.status).send(queryResult.data);
  },

  /** Get one part category from the database
   * at api route /databaseapi/getonepartcategory/:id
   * @param {object} req
   * @param {object} res
   * @returns {object} Part category data from database
   */
  async getOnePartCategory(req, res) {
    const queryResult = await query('part_category', req.params.id);
    return res.status(queryResult.status).send(queryResult.data);
  },

  /** Get all sets from database
   * at api route /databaseapi/getallsets
   * @param {object} req
   * @param {object} res
   * @returns {object} All set data from database
   */
  async getAllSets(req, res) {
    const queryResult = await query('sets');
    return res.status(queryResult.status).send(queryResult.data);
  },

  /** Update a database set with information not contained in rebrickable csv files
   * at api route /databaseapi/updateoneset/:id
   * @param {object} req
   * @param {object} res
   * @returns {object} Set with updated information
   */
  async putUpdateOneSet(req, res) {
    const set_num = req.params.id;
    axios
      .get(
        `http://192.168.50.199:9000/rebrickapi/getonefromrebrickable/${set_num}`,
      )
      .then(async (response) => {
        if (response.status === 200) {
          const rebrickableData = response.data;
          const db = await database.connect();
          const updateResponse = await updateOneSet(
            db,
            set_num,
            rebrickableData,
          );
          console.log(updateResponse);
          if (updateResponse.status === 200) {
            const queryResponse = await database.query(db, 'set', set_num);
            if (queryResponse.status === 200) {
              await database.close(db);
              return res.status(queryResponse.status).send(queryResponse.data);
            }
          } else {
            await database.close(db);
            return res.status(updateResponse.status).send(updateResponse.data);
          }
        }
      })
      .catch(async (err) => {
        console.log('error');
        res.status(404).send(err);
      });
  },

  /** Update all database sets with information not contained in rebrickable csv files
   * at api route /databaseapi/updateallsets
   * @param {object} req
   * @param {object} res
   * @returns {array} // All sets with updated information
   */
  async putUpdateAllSets(req, res) {
    let sets;
    const setsPath = path.resolve(
      __dirname,
      '../usingDB/rebrickData/sets.json',
    );
    try {
      sets = JSON.parse(loadData(setsPath));
    } catch (e) {
      sets = [];
    }

    if (!sets.length) {
      await axios
        .get(`http://192.168.50.199:9000/rebrickapi/getallsetsfromrebrickable`)
        .then((response) => {
          if (response.status === 200) {
            sets = response.data;
          }
        })
        .catch((err) => res.status(404).send(err));
    }

    if (sets.length) {
      const db = await database.connect();

      await Promise.all(
        sets.map(async (set) => {
          const set_num = set.set_num;
          console.log(`Updating ${set_num}.`);
          const updateResponse = await updateOneSet(db, set_num, set);
        }),
      ).then(async () => {
        await database.close(db);
        res.status(200).send(sets);
      });
    }
  },

  /** Update all database colors with information not contained in rebrickable csv files
   * at api route /databaseapi/updatallcolors
   * @param {object} req
   * @param {object} res
   * @returns {array} // All colors with updated information
   */
  async putUpdateAllColors(req, res) {
    let colors;
    const colorPath = path.resolve(
      __dirname,
      '../usingDB/rebrickData/colors.json',
    );

    try {
      colors = JSON.parse(loadData(colorPath));
    } catch (e) {
      colors = [];
    }

    if (!colors.length) {
      await axios
        .get(
          `http://192.168.50.199:9000/rebrickapi/getallcolorsfromrebrickable`,
        )
        .then((response) => {
          if (response.status === 200) {
            colors = response.data;
          }
        })
        .catch((err) => res.status(404).send(err));
    }

    if (colors.length) {
      const db = await database.connect();

      await Promise.all(
        colors.map(async (color) => {
          const id = color.id;
          console.log(`Updating ${color.name}.`);
          const updateResponse = await updateOneColor(db, id, color);
        }),
      ).then(async () => {
        await database.close(db);

        res.status(200).send(colors);
      });
    }
  },

  /** Update all database minifigs with information not contained in rebrickable csv files
   * at api route /databaseapi/updatallminifigs
   * @param {object} req
   * @param {object} res
   * @returns {array} // All minifigs with updated information
   */
  async putUpdateAllMinifigs(req, res) {
    let minifigs;
    const minifigPath = path.resolve(
      __dirname,
      '../usingDB/rebrickData/minifigs.json',
    );
    try {
      minifigs = JSON.parse(loadData(minifigPath));
    } catch {
      minifigs = [];
    }

    if (!minifigs.length) {
      await axios
        .get(`http://192.168.50.199:9000/rebrickapi/getallminifigs`)
        .then((response) => {
          if (response.status === 200) {
            minifigs = response.data;
          }
        })
        .catch((err) => res.status(404).send(err));
    }

    if (minifigs.length) {
      const db = await database.connect();

      await Promise.all(
        minifigs.map(async (minifig) => {
          const fig_num = minifig.set_num;
          console.log(`Updating ${minifig.name}.`);
          const updateResponse = await updateOneMinifig(db, fig_num, minifig);
        }),
      ).then(async () => {
        await database.close(db);

        res.status(200).send(minifigs);
      });
    }
  },

  /** Update all database parts with information not contained in rebrickable csv files
   * at api route /databaseapi/updatallparts
   * @param {object} req
   * @param {object} res
   * @returns {array} // All parts with updated information
   */
  async putUpdateAllParts(req, res) {
    let parts;
    const partsPath = path.resolve(
      __dirname,
      '../usingDB/rebrickData/parts.json',
    );
    try {
      parts = JSON.parse(loadData(partsPath));
    } catch {
      parts = [];
    }

    if (!parts.length) {
      await axios
        .get(`http://192.168.50.199:9000/rebrickapi/getallparts`)
        .then((response) => {
          if (response.status === 200) {
            parts = response.data;
          }
        })
        .catch((err) => res.status(404).send(err));
    }

    if (parts.length) {
      const db = await database.connect();

      await Promise.all(
        parts.map(async (part) => {
          const key = part.part_num;
          console.log(`Updating ${part.name}.`);

          const bricklinkId = part.external_ids.BrickLink
            ? part.external_ids.BrickLink[0]
            : null;
          const brickowlId = part.external_ids.BrickOwl
            ? part.external_ids.BrickOwl[0]
            : null;

          const updateParams = [
            part.part_url,
            part.part_img_url,
            bricklinkId,
            brickowlId,
            part.print_of,
            key,
          ];

          const updateResponse = await database.update(
            db,
            'part',
            updateParams,
          );
        }),
      ).then(async () => {
        await database.close(db);

        res.status(200).send(parts);
      });
    }
  },

  /** Update all database part categories with information not contained in rebrickable csv files
   * at api route /databaseapi/updatallpartcategories
   * @param {object} req
   * @param {object} res
   * @returns {array} // All part categories with updated information
   */
  async putUpdateAllPartCategories(req, res) {
    let partCategories;
    const partCategoriesPath = path.resolve(
      __dirname,
      '../usingDB/rebrickData/part_categories.json',
    );
    try {
      partCategories = JSON.parse(loadData(partCategoriesPath));
    } catch {
      partCategories = [];
    }

    if (!partCategories.length) {
      await axios
        .get(`http://192.168.50.199:9000/rebrickapi/getallpartcategories`)
        .then((response) => {
          if (response.status === 200) {
            partCategories = response.data;
          }
        })
        .catch((err) => res.status(404).send(err));
    }

    if (partCategories.length) {
      const db = await database.connect();

      await Promise.all(
        partCategories.map(async (partCategory) => {
          const id = partCategory.id;
          console.log(`Updating ${partCategory.name}.`);

          const updateParams = [partCategory.part_count, id];
          const updateResponse = await database.update(
            db,
            'part_categories',
            updateParams,
          );
        }),
      ).then(async () => {
        await database.close(db);

        res.status(200).send(partCategories);
      });
    }
  },
};

module.exports = Posts;
