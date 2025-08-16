import fetch from 'node-fetch';
import type { CMSAdapter, PublishInput, PublishResult } from './adapter';

const wordpress: CMSAdapter = {
  id: 'wordpress',
  name: 'WordPress.com',
  supports: {
    images: true,
    tags: true,
    scheduling: true,
    edit: true,
    delete: true,
  },
  async verifyConnection(auth: { token: string }) {
    try {
      const res = await fetch('https://public-api.wordpress.com/rest/v1.1/me', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, details: data };
      }
      return { ok: false, details: await res.text() };
    } catch (err) {
      console.error('WP verify error', err);
      return { ok: false, details: err };
    }
  },
  async listPosts(auth, opts) {
    // Placeholder: would call WordPress API
    return [];
  },
  async createPost(auth: { token: string; siteId: string }, input: PublishInput): Promise<PublishResult> {
    // Placeholder implementation
    console.log('Creating WP post', input);
    return { ok: true, postId: 'demo', url: 'https://example.com', details: {} };
  },
  async updatePost(auth, postId, input) {
    return { ok: true, postId, url: 'https://example.com', details: {} };
  },
  async deletePost(auth, postId) {
    return { ok: true };
  },
  async uploadImage(auth, file, filename) {
    return { url: 'https://example.com/image.jpg', id: 'img123' };
  },
};

export default wordpress;