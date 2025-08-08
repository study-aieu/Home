require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { signJwt, authMiddleware } = require('./auth');
const { encryptString } = require('./crypto');
const wp = require('./wordpress');

const app = express();
const upload = multer();

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

// Auth
app.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const passwordHash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash);
    const token = signJwt({ userId: info.lastInsertRowid, email });
    res.json({ token });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signJwt({ userId: user.id, email: user.email });
  res.json({ token });
});

// Connect Site
app.post('/connect-site', authMiddleware, async (req, res) => {
  const { url, username, appPassword } = req.body || {};
  if (!url || !username || !appPassword) return res.status(400).json({ error: 'url, username, appPassword required' });
  try {
    await wp.verifyCredentials(url, username, appPassword);
  } catch (err) {
    return res.status(400).json({ error: 'Unable to verify WordPress credentials' });
  }
  const { payload, iv } = encryptString(appPassword);
  db.prepare(
    'INSERT INTO site_connections (user_id, wp_url, wp_username, wp_app_password_enc, wp_app_password_iv) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.userId, url, username, payload, iv);
  res.json({ ok: true });
});

// Posts
app.get('/posts', authMiddleware, async (req, res) => {
  try {
    const posts = await wp.listPosts(req.user.userId, { per_page: 20 });
    res.json(posts);
  } catch (err) {
    res.status(400).json({ error: String(err.message) });
  }
});

app.post('/posts', authMiddleware, async (req, res) => {
  const { title, content, status = 'publish', featured_media } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  try {
    const created = await wp.createPost(req.user.userId, { title, content, status, featured_media });
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: String(err.message) });
  }
});

app.put('/posts/:id', authMiddleware, async (req, res) => {
  const postId = req.params.id;
  try {
    const updated = await wp.updatePost(req.user.userId, postId, req.body || {});
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: String(err.message) });
  }
});

app.delete('/posts/:id', authMiddleware, async (req, res) => {
  const postId = req.params.id;
  try {
    const deleted = await wp.deletePost(req.user.userId, postId);
    res.json(deleted);
  } catch (err) {
    res.status(400).json({ error: String(err.message) });
  }
});

// Media upload
app.post('/upload-image', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image file required' });
  try {
    const media = await wp.uploadMedia(
      req.user.userId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    res.json(media);
  } catch (err) {
    res.status(400).json({ error: String(err.message) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});