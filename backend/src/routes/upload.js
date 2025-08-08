const express = require('express');
const multer = require('multer');
const axios = require('axios');
const auth = require('../middleware/auth');
const { Blog } = require('../models');

const upload = multer({ storage: multer.memoryStorage() });

function createWpClient(baseUrl, username, appPassword) {
  const token = Buffer.from(`${username}:${appPassword}`).toString('base64');
  return axios.create({
    baseURL: `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2`,
    headers: {
      Authorization: `Basic ${token}`,
    },
  });
}

const router = express.Router();

// POST /upload
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const blog = await Blog.findOne({ where: { userId: req.userId } });
    if (!blog) return res.status(400).json({ message: 'Blog not connected' });

    const wp = createWpClient(blog.url, blog.username, blog.appPassword);

    const response = await wp.post('/media', req.file.buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${req.file.originalname}"`,
        'Content-Type': req.file.mimetype,
      },
    });

    return res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error);
    return res.status(500).json({ message: 'Failed to upload image' });
  }
});

module.exports = router;