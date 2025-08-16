import { BaseCMSAdapter } from './base';
import { ProviderCredentials, PublishInput, PublishResult, ExternalPost, AuthField } from '../types';
import { AxiosRequestConfig } from 'axios';
import jwt from 'jsonwebtoken';

/**
 * Ghost CMS adapter for self-hosted Ghost blogs
 */
export class GhostAdapter extends BaseCMSAdapter {
  id = 'ghost';
  name = 'Ghost';
  description = 'Publish to Ghost CMS (self-hosted)';
  website = 'https://ghost.org';

  authFields: AuthField[] = [
    {
      key: 'siteUrl',
      label: 'Ghost Site URL',
      type: 'url',
      required: true,
      placeholder: 'https://yourblog.com',
      description: 'Your Ghost blog URL'
    },
    {
      key: 'adminApiKey',
      label: 'Admin API Key',
      type: 'password',
      required: true,
      placeholder: 'Your Ghost Admin API key',
      description: 'Get this from Ghost Admin > Integrations > Custom Integration'
    }
  ];

  supports = {
    images: true,
    tags: true,
    categories: false,
    scheduling: true,
    drafts: true,
    edit: true,
    delete: true,
    excerpt: true,
    featuredImage: true,
  };

  protected addAuthHeaders(config: AxiosRequestConfig, auth: ProviderCredentials): AxiosRequestConfig {
    const token = this.generateJWT(auth.adminApiKey);
    config.headers = {
      ...config.headers,
      'Authorization': `Ghost ${token}`,
    };
    return config;
  }

  async verifyConnection(auth: ProviderCredentials): Promise<{ ok: boolean; details?: any; error?: string }> {
    try {
      this.validateAuth(auth, ['siteUrl', 'adminApiKey']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      const response = await client.get('/site/');
      
      return {
        ok: true,
        details: {
          title: response.data.site.title,
          description: response.data.site.description,
          url: response.data.site.url,
          version: response.data.site.version
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }

  async listPosts(auth: ProviderCredentials, opts?: { page?: number; limit?: number }): Promise<ExternalPost[]> {
    try {
      this.validateAuth(auth, ['siteUrl', 'adminApiKey']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      const params = {
        page: opts?.page || 1,
        limit: Math.min(opts?.limit || 15, 50),
        include: 'tags,authors'
      };
      
      const response = await client.get('/posts/', { params });
      
      return response.data.posts.map((post: any) => this.mapGhostPost(post));
    } catch (error) {
      this.handleError(error, 'list posts');
    }
  }

  async createPost(auth: ProviderCredentials, input: PublishInput): Promise<PublishResult> {
    try {
      this.validateAuth(auth, ['siteUrl', 'adminApiKey']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      const postData: any = {
        title: input.title,
        html: input.content,
        excerpt: input.excerpt,
        tags: input.tags?.map(tag => ({ name: tag })) || [],
        status: input.publishedAt ? 'published' : 'draft',
      };
      
      if (input.publishedAt) {
        postData.published_at = input.publishedAt.toISOString();
      }
      
      if (input.featuredImage) {
        postData.feature_image = input.featuredImage;
      }
      
      const response = await client.post('/posts/', {
        posts: [postData]
      });
      
      const createdPost = response.data.posts[0];
      
      return {
        success: true,
        externalId: createdPost.id,
        url: createdPost.url,
        metadata: {
          status: createdPost.status,
          slug: createdPost.slug,
          uuid: createdPost.uuid
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updatePost(auth: ProviderCredentials, postId: string, input: PublishInput): Promise<PublishResult> {
    try {
      this.validateAuth(auth, ['siteUrl', 'adminApiKey']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      // First get the current post to get the updated_at timestamp
      const currentPostResponse = await client.get(`/posts/${postId}/`);
      const currentPost = currentPostResponse.data.posts[0];
      
      const postData: any = {
        title: input.title,
        html: input.content,
        excerpt: input.excerpt,
        tags: input.tags?.map(tag => ({ name: tag })) || [],
        updated_at: currentPost.updated_at, // Required for updates
      };
      
      if (input.publishedAt) {
        postData.published_at = input.publishedAt.toISOString();
        postData.status = 'published';
      }
      
      if (input.featuredImage) {
        postData.feature_image = input.featuredImage;
      }
      
      const response = await client.put(`/posts/${postId}/`, {
        posts: [postData]
      });
      
      const updatedPost = response.data.posts[0];
      
      return {
        success: true,
        externalId: updatedPost.id,
        url: updatedPost.url,
        metadata: {
          status: updatedPost.status,
          slug: updatedPost.slug,
          uuid: updatedPost.uuid
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deletePost(auth: ProviderCredentials, postId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      this.validateAuth(auth, ['siteUrl', 'adminApiKey']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      await client.delete(`/posts/${postId}/`);
      
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error.message
      };
    }
  }

  async uploadImage(auth: ProviderCredentials, file: Buffer, filename: string): Promise<{ url: string; id?: string }> {
    try {
      this.validateAuth(auth, ['siteUrl', 'adminApiKey']);
      
      const baseURL = this.getApiUrl(auth.siteUrl);
      const client = this.createHttpClient(auth, baseURL);
      
      const formData = new FormData();
      formData.append('file', new Blob([file]), filename);
      
      const response = await client.post('/images/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return {
        url: response.data.images[0].url,
        id: response.data.images[0].ref
      };
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  private getApiUrl(siteUrl: string): string {
    const url = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
    return `${url}/ghost/api/v3/admin`;
  }

  private generateJWT(adminApiKey: string): string {
    // Split the key into ID and secret
    const [id, secret] = adminApiKey.split(':');
    
    const header = {
      alg: 'HS256',
      typ: 'JWT',
      kid: id
    };
    
    const payload = {
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes
      aud: '/v3/admin/'
    };
    
    return jwt.sign(payload, Buffer.from(secret, 'hex'), {
      algorithm: 'HS256',
      header
    });
  }

  private mapGhostPost(post: any): ExternalPost {
    return {
      id: post.id,
      title: post.title,
      content: post.html,
      excerpt: post.excerpt,
      tags: post.tags?.map((tag: any) => tag.name) || [],
      featuredImage: post.feature_image,
      publishedAt: post.published_at ? new Date(post.published_at) : undefined,
      status: post.status,
      url: post.url,
      metadata: {
        slug: post.slug,
        uuid: post.uuid,
        updatedAt: post.updated_at,
        authors: post.authors?.map((author: any) => author.name) || []
      }
    };
  }
}