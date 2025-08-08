const axios = require('axios');
const { decryptString } = require('./crypto');
const db = require('./db');

function getUserConnection(userId) {
  const row = db.prepare(
    'SELECT wp_url, wp_username, wp_app_password_enc, wp_app_password_iv FROM site_connections WHERE user_id = ? ORDER BY id DESC LIMIT 1'
  ).get(userId);
  if (!row) return null;
  const password = decryptString(row.wp_app_password_enc, row.wp_app_password_iv);
  return { baseUrl: sanitizeBaseUrl(row.wp_url), username: row.wp_username, password };
}

function sanitizeBaseUrl(url) {
  let u = url.trim();
  if (u.endsWith('/')) u = u.slice(0, -1);
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

function authHeader(username, password) {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

async function verifyCredentials(baseUrl, username, password) {
  const url = `${sanitizeBaseUrl(baseUrl)}/wp-json/wp/v2/users/me`;
  const { data } = await axios.get(url, { headers: authHeader(username, password) });
  return data;
}

async function listPosts(userId, params = {}) {
  const conn = getUserConnection(userId);
  if (!conn) throw new Error('No connected site');
  const url = `${conn.baseUrl}/wp-json/wp/v2/posts`;
  const { data } = await axios.get(url, { headers: authHeader(conn.username, conn.password), params });
  return data;
}

async function createPost(userId, post) {
  const conn = getUserConnection(userId);
  if (!conn) throw new Error('No connected site');
  const url = `${conn.baseUrl}/wp-json/wp/v2/posts`;
  const { data } = await axios.post(url, post, { headers: { ...authHeader(conn.username, conn.password), 'Content-Type': 'application/json' } });
  return data;
}

async function updatePost(userId, postId, post) {
  const conn = getUserConnection(userId);
  if (!conn) throw new Error('No connected site');
  const url = `${conn.baseUrl}/wp-json/wp/v2/posts/${postId}`;
  const { data } = await axios.post(url, post, { headers: { ...authHeader(conn.username, conn.password), 'Content-Type': 'application/json' } });
  return data;
}

async function deletePost(userId, postId) {
  const conn = getUserConnection(userId);
  if (!conn) throw new Error('No connected site');
  const url = `${conn.baseUrl}/wp-json/wp/v2/posts/${postId}`;
  const { data } = await axios.delete(url, { headers: authHeader(conn.username, conn.password), params: { force: true } });
  return data;
}

async function uploadMedia(userId, fileBuffer, filename, mimeType) {
  const conn = getUserConnection(userId);
  if (!conn) throw new Error('No connected site');
  const url = `${conn.baseUrl}/wp-json/wp/v2/media`;
  const headers = {
    ...authHeader(conn.username, conn.password),
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Type': mimeType || 'application/octet-stream',
  };
  const { data } = await axios.post(url, fileBuffer, { headers });
  return data;
}

module.exports = {
  getUserConnection,
  verifyCredentials,
  listPosts,
  createPost,
  updatePost,
  deletePost,
  uploadMedia,
};