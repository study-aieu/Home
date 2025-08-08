const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const { Blog } = require('../models');

const router = express.Router();

function createWpClient(baseUrl, username, appPassword) {
  const token = Buffer.from(`${username}:${appPassword}`).toString('base64');
  return axios.create({
    baseURL: `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2`,
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// POST /posts
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, status = 'publish' } = req.body;
    const blog = await Blog.findOne({ where: { userId: req.userId } });
    if (!blog) return res.status(400).json({ message: 'Blog not connected' });

    const wp = createWpClient(blog.url, blog.username, blog.appPassword);
    const response = await wp.post('/posts', { title, content, status });

    return res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error);
    return res.status(500).json({ message: 'Failed to create post' });
  }
});

// GET /posts
router.get('/', auth, async (req, res) => {
  try {
    const blog = await Blog.findOne({ where: { userId: req.userId } });
    if (!blog) return res.status(400).json({ message: 'Blog not connected' });

    const wp = createWpClient(blog.url, blog.username, blog.appPassword);
    const response = await wp.get('/posts');

    return res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error);
    return res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// PUT /posts/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status } = req.body;
    const blog = await Blog.findOne({ where: { userId: req.userId } });
    if (!blog) return res.status(400).json({ message: 'Blog not connected' });

    const wp = createWpClient(blog.url, blog.username, blog.appPassword);
    const response = await wp.post(`/posts/${id}`, { title, content, status });

    return res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error);
    return res.status(500).json({ message: 'Failed to update post' });
  }
});

// DELETE /posts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findOne({ where: { userId: req.userId } });
    if (!blog) return res.status(400).json({ message: 'Blog not connected' });

    const wp = createWpClient(blog.url, blog.username, blog.appPassword);
    const response = await wp.delete(`/posts/${id}?force=true`);

    return res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error);
    return res.status(500).json({ message: 'Failed to delete post' });
  }
});

module.exports = router;