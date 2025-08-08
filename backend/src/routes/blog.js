const express = require('express');
const { Blog } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /blog/connect-site
router.post('/connect-site', auth, async (req, res) => {
  try {
    const { url, username, appPassword } = req.body;
    if (!url || !username || !appPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const [blog] = await Blog.upsert({
      userId: req.userId,
      url,
      username,
      appPassword,
    });

    return res.json({ message: 'Site connected', blog });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /blog
router.get('/', auth, async (req, res) => {
  try {
    const blog = await Blog.findOne({ where: { userId: req.userId } });
    return res.json(blog);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;