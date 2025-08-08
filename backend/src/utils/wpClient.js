const axios = require('axios');

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

module.exports = createWpClient;