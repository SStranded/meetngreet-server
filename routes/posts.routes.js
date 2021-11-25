const express = require('express');
const router = express.Router();
const Posts = require('../controllers/posts');

router.post('/', Posts.newPost);
router.get('/get-posts', Posts.getPosts);
router.post('/reset', Posts.reset);
router.post('/fake-fill', Posts.fakefill);

module.exports = router;
